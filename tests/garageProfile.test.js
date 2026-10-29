const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getGarageProfileCompletion,
  isGarageVisibleToCustomers,
  canManageGarage,
  DEFAULT_LATITUDE,
  DEFAULT_LONGITUDE
} = require('../utils/garageProfile');

const completeGarage = (overrides = {}) => ({
  _id: 'g1',
  status: 'Approved',
  address: '1 High Street',
  postcode: 'LS1 1AA',
  latitude: 53.7997,
  longitude: -1.5492,
  locationConfigured: true,
  servicesConfigured: true,
  documentsConfigured: true,
  services: [{ name: 'MOT Test', price: 45, isActive: true }],
  verificationDocuments: [{ name: 'VTS', fileUrl: 'https://x/doc.pdf' }],
  ...overrides
});

test('an approved garage with location, an active service and documents is visible to customers', () => {
  const g = completeGarage();
  assert.deepEqual(getGarageProfileCompletion(g), {
    complete: true,
    steps: { location: true, services: true, documents: true },
    missing: []
  });
  assert.equal(isGarageVisibleToCustomers(g), true);
});

test('approved but incomplete garages are hidden from customers', () => {
  const noLocation = completeGarage({ locationConfigured: false, latitude: DEFAULT_LATITUDE, longitude: DEFAULT_LONGITUDE });
  assert.deepEqual(getGarageProfileCompletion(noLocation).missing, ['location']);
  assert.equal(isGarageVisibleToCustomers(noLocation), false);

  const noServices = completeGarage({ services: [] });
  assert.deepEqual(getGarageProfileCompletion(noServices).missing, ['services']);
  assert.equal(isGarageVisibleToCustomers(noServices), false);

  const onlyInactiveServices = completeGarage({ services: [{ name: 'MOT', price: 45, isActive: false }] });
  assert.equal(isGarageVisibleToCustomers(onlyInactiveServices), false);

  const noDocs = completeGarage({ documentsConfigured: false, verificationDocuments: [] });
  assert.deepEqual(getGarageProfileCompletion(noDocs).missing, ['documents']);
  assert.equal(isGarageVisibleToCustomers(noDocs), false);
});

test('a complete profile is still hidden until the garage is Approved', () => {
  assert.equal(isGarageVisibleToCustomers(completeGarage({ status: 'Pending' })), false);
  assert.equal(isGarageVisibleToCustomers(completeGarage({ status: 'Rejected' })), false);
  assert.equal(isGarageVisibleToCustomers(null), false);
});

test('older garages without the setup flags count as complete when the real data is present', () => {
  const legacy = completeGarage({ locationConfigured: false, documentsConfigured: false, servicesConfigured: false });
  assert.equal(isGarageVisibleToCustomers(legacy), true);
});

test('address/postcode alone with the default London coordinates does not count as a configured location', () => {
  const g = completeGarage({ locationConfigured: false, latitude: DEFAULT_LATITUDE, longitude: DEFAULT_LONGITUDE });
  assert.equal(getGarageProfileCompletion(g).steps.location, false);
});

test('canManageGarage: platform admin and the garage\'s own admin/staff only', () => {
  const g = completeGarage();
  assert.equal(canManageGarage({ role: 'admin' }, g), true);
  assert.equal(canManageGarage({ role: 'garage_admin', garageId: 'g1' }, g), true);
  assert.equal(canManageGarage({ role: 'staff', garageId: 'g1' }, g), true);
  assert.equal(canManageGarage({ role: 'staff', garageId: 'other' }, g), false);
  assert.equal(canManageGarage({ role: 'customer', garageId: 'g1' }, g), false);
  assert.equal(canManageGarage(undefined, g), false);
});
