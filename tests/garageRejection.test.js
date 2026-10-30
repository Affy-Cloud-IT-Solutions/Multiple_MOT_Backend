const test = require('node:test');
const assert = require('node:assert/strict');
const garageController = require('../controllers/garageController');
const Garage = require('../models/Garage');
const Alert = require('../models/Alert');
const Audit = require('../models/Audit');
const ServiceCategory = require('../models/ServiceCategory');

const GARAGE_ID = '64b7f0f0f0f0f0f0f0f0f0b1';
const SUPER_ADMIN = { role: 'admin' };
const GARAGE_ADMIN = { role: 'garage_admin', garageId: GARAGE_ID, name: 'Owner' };

// No email address, so status emails are skipped instead of being sent
function makeGarage(overrides = {}) {
  const doc = new Garage({
    _id: GARAGE_ID,
    name: 'Test Garage',
    status: 'Pending',
    address: '1 High Street',
    postcode: 'LS1 1AA',
    latitude: 53.7997,
    longitude: -1.5492,
    locationConfigured: true,
    servicesConfigured: true,
    documentsConfigured: true,
    services: [{ name: 'MOT Test', price: 45, isActive: true }],
    verificationDocuments: [
      { name: 'VTS Certificate', documentType: 'VTS Certificate', fileUrl: 'https://x/vts.pdf', status: 'Pending' },
      { name: 'Public Liability Insurance', documentType: 'Public Liability Insurance', fileUrl: 'https://x/pli.pdf', status: 'Pending' }
    ],
    ...overrides
  });
  doc.save = async function () { return this; };
  return doc;
}

function call(handler, req) {
  return new Promise(resolve => {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { resolve({ status: this.statusCode, body }); }
    };
    handler(req, res);
  });
}

let currentGarage;
let createdAlerts;
const originals = { findById: Garage.findById, alertCreate: Alert.create, auditCreate: Audit.create, categoryFind: ServiceCategory.find };
test.beforeEach(() => {
  createdAlerts = [];
  Garage.findById = async () => currentGarage;
  Alert.create = async data => { createdAlerts.push(data); return data; };
  Audit.create = async data => data;
  ServiceCategory.find = async () => [{ name: 'MOT' }, { name: 'Servicing' }, { name: 'Tyres' }];
});
test.after(() => {
  Garage.findById = originals.findById;
  Alert.create = originals.alertCreate;
  Audit.create = originals.auditCreate;
  ServiceCategory.find = originals.categoryFind;
});

test('rejecting the whole application makes the garage redo every step and re-upload every document', async () => {
  currentGarage = makeGarage();
  const { status, body } = await call(garageController.updateGarageStatus, {
    params: { id: GARAGE_ID }, user: SUPER_ADMIN, body: { status: 'Rejected', rejectionReason: 'Address does not match VTS' }
  });

  assert.equal(status, 200);
  assert.equal(currentGarage.status, 'Rejected');
  assert.deepEqual([...currentGarage.redoSteps], ['location', 'services']);
  assert.ok(currentGarage.verificationDocuments.every(d => d.status === 'Rejected'));
  assert.equal(body.garage.profileCompletion.complete, false);
  assert.deepEqual(body.garage.profileCompletion.missing, ['location', 'services', 'documents']);
  assert.equal(body.garage.profileCompletion.percent, 25);
});

test('a rejected application cannot be resubmitted until every step is redone, then goes back to Pending', async () => {
  currentGarage = makeGarage();
  await call(garageController.updateGarageStatus, {
    params: { id: GARAGE_ID }, user: SUPER_ADMIN, body: { status: 'Rejected', rejectionReason: 'Blurry documents' }
  });

  const early = await call(garageController.submitGarageForReview, { params: { id: GARAGE_ID }, user: GARAGE_ADMIN });
  assert.equal(early.status, 400);
  assert.deepEqual(early.body.missing, ['location', 'services', 'documents']);
  assert.equal(currentGarage.status, 'Rejected');

  // Redo location and services
  await call(garageController.updateGarage, {
    params: { id: GARAGE_ID }, user: GARAGE_ADMIN, body: { address: '2 High Street', postcode: 'LS1 1AB', images: ['https://x/1.jpg', 'https://x/2.jpg', 'https://x/3.jpg'], locationConfigured: true }
  });
  await call(garageController.updateGarage, {
    params: { id: GARAGE_ID }, user: GARAGE_ADMIN,
    body: { services: [{ name: 'MOT Test', category: 'MOT', price: 50, isActive: true }], servicesConfigured: true }
  });
  assert.deepEqual([...currentGarage.redoSteps], []);

  // Re-upload both documents - each replaces its rejected copy
  for (const type of ['VTS Certificate', 'Public Liability Insurance']) {
    await call(garageController.uploadGarageDocs, {
      params: { id: GARAGE_ID }, user: GARAGE_ADMIN, body: { documentName: type, documentType: type, fileUrl: `https://x/new-${type}.pdf` }
    });
  }
  assert.equal(currentGarage.verificationDocuments.length, 2);
  assert.ok(currentGarage.verificationDocuments.every(d => d.status === 'Pending' && d.fileUrl.includes('/new-')));

  const submitted = await call(garageController.submitGarageForReview, { params: { id: GARAGE_ID }, user: GARAGE_ADMIN });
  assert.equal(submitted.status, 200);
  assert.equal(currentGarage.status, 'Pending');
  assert.equal(currentGarage.rejectionReason, '');
  assert.match(createdAlerts[0].makeModel, /Re-submitted After Rejection/);
});

test('one rejected document only needs that document re-uploaded - nothing else is reset', async () => {
  currentGarage = makeGarage();
  const vts = currentGarage.verificationDocuments[0];
  await call(garageController.updateGarageDocumentStatus, {
    params: { id: GARAGE_ID, docId: String(vts._id) }, user: SUPER_ADMIN, body: { status: 'Rejected', rejectionReason: 'Expired certificate' }
  });

  assert.equal(currentGarage.status, 'Pending');
  assert.deepEqual([...currentGarage.redoSteps], []);
  assert.equal(currentGarage.verificationDocuments[1].status, 'Pending');

  const { body } = await call(garageController.uploadGarageDocs, {
    params: { id: GARAGE_ID }, user: GARAGE_ADMIN,
    body: { documentName: 'VTS Certificate', documentType: 'VTS Certificate', fileUrl: 'https://x/vts-2026.pdf' }
  });
  assert.equal(currentGarage.verificationDocuments.length, 2);
  assert.equal(currentGarage.verificationDocuments[0].fileUrl, 'https://x/vts-2026.pdf');
  assert.equal(currentGarage.verificationDocuments[0].status, 'Pending');
  assert.equal(currentGarage.verificationDocuments[0].rejectionReason, '');
  assert.equal(body.garage.profileCompletion.steps.documents, true);
});

test('approving clears any redo steps and document rejection notes', async () => {
  currentGarage = makeGarage({ status: 'Rejected', redoSteps: ['location'] });
  currentGarage.verificationDocuments[0].status = 'Rejected';
  currentGarage.verificationDocuments[0].rejectionReason = 'Blurry';
  const { body } = await call(garageController.updateGarageStatus, {
    params: { id: GARAGE_ID }, user: SUPER_ADMIN, body: { status: 'Approved' }
  });
  assert.deepEqual([...currentGarage.redoSteps], []);
  assert.ok(currentGarage.verificationDocuments.every(d => d.status === 'Verified' && d.rejectionReason === ''));
  assert.equal(body.garage.isVisibleToCustomers, true);
});

test('saving the location step needs at least 3 garage photos', async () => {
  currentGarage = makeGarage();
  const twoPhotos = await call(garageController.updateGarage, {
    params: { id: GARAGE_ID }, user: GARAGE_ADMIN,
    body: { address: '2 High Street', postcode: 'LS1 1AB', images: ['https://x/1.jpg', 'https://x/2.jpg'], locationConfigured: true }
  });
  assert.equal(twoPhotos.status, 400);
  assert.match(twoPhotos.body.error, /at least 3 photos/);

  const threePhotos = await call(garageController.updateGarage, {
    params: { id: GARAGE_ID }, user: GARAGE_ADMIN,
    body: { address: '2 High Street', postcode: 'LS1 1AB', images: ['https://x/1.jpg', 'https://x/2.jpg', 'https://x/3.jpg'], locationConfigured: true }
  });
  assert.equal(threePhotos.status, 200);
  assert.equal(currentGarage.images.length, 3);
});

test('garages can only save services in categories the Super Admin created', async () => {
  currentGarage = makeGarage();
  const blocked = await call(garageController.updateGarage, {
    params: { id: GARAGE_ID }, user: GARAGE_ADMIN,
    body: { services: [{ name: 'Brake Pads', category: 'Brakes', price: 70 }], servicesConfigured: true }
  });
  assert.equal(blocked.status, 400);
  assert.match(blocked.body.error, /Brake Pads/);

  const allowed = await call(garageController.updateGarage, {
    params: { id: GARAGE_ID }, user: GARAGE_ADMIN,
    body: { services: [{ name: 'Tyre Fitting', category: 'Tyres', price: 30 }], servicesConfigured: true }
  });
  assert.equal(allowed.status, 200);
});
