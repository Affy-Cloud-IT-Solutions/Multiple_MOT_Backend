const test = require('node:test');
const assert = require('node:assert/strict');
const { getGarageProfileCompletion, isGarageVisibleToCustomers, canManageGarage } = require('../utils/garageProfile');
const garageController = require('../controllers/garageController');
const alertController = require('../controllers/alertController');
const Garage = require('../models/Garage');
const Alert = require('../models/Alert');
const Audit = require('../models/Audit');
const User = require('../models/User');

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

test('Lifecycle 1: newly created garage (Pending) is visible to customers but NOT marked Verified', () => {
  const newGarage = {
    _id: 'garage_pending_1',
    name: 'Auto Rapid Care',
    status: 'Pending',
    verificationStatus: 'Pending',
    address: '12 Victoria Road',
    postcode: 'M1 1AA',
    latitude: 53.4808,
    longitude: -2.2426,
    services: [],
    verificationDocuments: []
  };

  // Visible to customers right after clicking Create Account
  assert.equal(isGarageVisibleToCustomers(newGarage), true);

  const completion = getGarageProfileCompletion(newGarage);
  // Not 100% complete yet (only registration + location done)
  assert.notEqual(completion.percent, 100);
  assert.equal(completion.complete, false);

  const formatted = garageController.formatDoc(newGarage);
  assert.equal(formatted.isVisibleToCustomers, true);
  assert.equal(formatted.isFullyVerified, false);
  assert.equal(formatted.isVerified, false);
});

test('Lifecycle 2: partially configured garage (e.g. docs skipped) remains visible and NOT Verified', () => {
  const partialGarage = {
    _id: 'garage_partial_1',
    name: 'Midlands Service Point',
    status: 'Pending',
    verificationStatus: 'Pending',
    address: '45 Broad Street',
    postcode: 'B1 2HP',
    latitude: 52.4862,
    longitude: -1.8904,
    locationConfigured: true,
    servicesConfigured: true,
    documentsConfigured: false,
    services: [{ name: 'Full Service', price: 120, isActive: true }],
    verificationDocuments: [] // Skipped under 7-day grace period
  };

  assert.equal(isGarageVisibleToCustomers(partialGarage), true);

  const completion = getGarageProfileCompletion(partialGarage);
  assert.equal(completion.percent, 75); // 3 of 4 checklist items
  assert.equal(completion.complete, false);

  const formatted = garageController.formatDoc(partialGarage);
  assert.equal(formatted.isVisibleToCustomers, true);
  assert.equal(formatted.isFullyVerified, false);
  assert.equal(formatted.isVerified, false);
});

test('Lifecycle 3: 100% fully completed & verified garage receives the Verified badge', () => {
  const fullyVerifiedGarage = {
    _id: 'garage_verified_1',
    name: 'Prestige MOT & Diagnostics',
    status: 'Approved',
    verificationStatus: 'Verified',
    address: '88 High Street',
    postcode: 'SW1A 1AA',
    latitude: 51.5014,
    longitude: -0.1419,
    locationConfigured: true,
    servicesConfigured: true,
    documentsConfigured: true,
    services: [{ name: 'Class 4 MOT', price: 45, isActive: true }],
    verificationDocuments: [
      { name: 'VTS Certificate', fileUrl: 'https://cdn/vts.pdf', status: 'Verified' },
      { name: 'Public Liability Insurance', fileUrl: 'https://cdn/insurance.pdf', status: 'Verified' }
    ]
  };

  assert.equal(isGarageVisibleToCustomers(fullyVerifiedGarage), true);

  const completion = getGarageProfileCompletion(fullyVerifiedGarage);
  assert.equal(completion.percent, 100);
  assert.equal(completion.complete, true);

  const formatted = garageController.formatDoc(fullyVerifiedGarage);
  assert.equal(formatted.isVisibleToCustomers, true);
  assert.equal(formatted.isFullyVerified, true);
  assert.equal(formatted.isVerified, true);
});

test('Lifecycle 4: Super Admin rejection hides garage from customers, returns 404, and blocks bookings', async () => {
  const rejectedGarage = {
    _id: 'garage_rejected_1',
    name: 'Rogue Garage Ltd',
    status: 'Rejected',
    verificationStatus: 'Rejected',
    rejectionReason: 'Invalid DVLA VTS testing credentials provided',
    address: '99 Shady Lane',
    postcode: 'E1 6AN',
    latitude: 51.5200,
    longitude: -0.0700,
    locationConfigured: true,
    servicesConfigured: true,
    services: [{ name: 'MOT Test', price: 40, isActive: true }]
  };

  // 1. Must NOT be visible to customers
  assert.equal(isGarageVisibleToCustomers(rejectedGarage), false);

  const formatted = garageController.formatDoc(rejectedGarage);
  assert.equal(formatted.isVisibleToCustomers, false);
  assert.equal(formatted.isFullyVerified, false);
  assert.equal(formatted.isVerified, false);

  // 2. Direct lookup by customer returns 404 Not Found
  const originalFindById = Garage.findById;
  try {
    Garage.findById = async () => rejectedGarage;

    const reqCustomer = {
      params: { id: 'garage_rejected_1' },
      query: { date: '2026-11-20' },
      user: { role: 'customer', id: 'cust_1' }
    };
    const resCustomer = mockResponse();
    await garageController.getGarageById(reqCustomer, resCustomer);
    assert.equal(resCustomer.statusCode, 404);
    assert.match(resCustomer.body.error, /not active/i);

    // 3. Slot query returns 403 Forbidden
    const resSlots = mockResponse();
    await garageController.getGarageSlots(reqCustomer, resSlots);
    assert.equal(resSlots.statusCode, 403);

    // 4. Booking creation is rejected with 400 Bad Request
    const reqBooking = {
      body: {
        type: 'BOOKED',
        garageId: 'garage_rejected_1',
        serviceName: 'MOT Test',
        date: '2026-11-20'
      },
      user: { role: 'customer', id: 'cust_1', customerId: 'cust_1' }
    };
    const resBooking = mockResponse();
    await alertController.createAlert(reqBooking, resBooking);
    assert.equal(resBooking.statusCode, 400);
    assert.match(resBooking.body.error, /rejected/i);
  } finally {
    Garage.findById = originalFindById;
  }
});

test('Lifecycle 5: Blacklisted garage is strictly hidden from customers', () => {
  const blacklisted = {
    _id: 'garage_blacklisted_1',
    name: 'Suspended Workshop',
    status: 'Blacklisted',
    verificationStatus: 'Rejected'
  };

  assert.equal(isGarageVisibleToCustomers(blacklisted), false);
  const formatted = garageController.formatDoc(blacklisted);
  assert.equal(formatted.isVisibleToCustomers, false);
  assert.equal(formatted.isFullyVerified, false);
});

test('Loophole check: garage with uploaded documents that are Rejected cannot be marked Verified', () => {
  const docRejectedGarage = {
    _id: 'garage_bad_docs',
    name: 'Quick Fix Depot',
    status: 'Pending',
    verificationStatus: 'Pending',
    address: '10 Industrial Way',
    postcode: 'LE1 1AA',
    latitude: 52.6369,
    longitude: -1.1398,
    locationConfigured: true,
    servicesConfigured: true,
    documentsConfigured: true,
    services: [{ name: 'MOT Test', price: 45, isActive: true }],
    verificationDocuments: [
      { name: 'VTS Certificate', fileUrl: 'https://cdn/vts.pdf', status: 'Rejected', rejectionReason: 'Expired certificate' }
    ]
  };

  const completion = getGarageProfileCompletion(docRejectedGarage);
  assert.equal(completion.steps.documents, false);
  assert.equal(completion.percent, 75);
  assert.equal(completion.complete, false);

  const formatted = garageController.formatDoc(docRejectedGarage);
  assert.equal(formatted.isFullyVerified, false);
  assert.equal(formatted.isVerified, false);
});
