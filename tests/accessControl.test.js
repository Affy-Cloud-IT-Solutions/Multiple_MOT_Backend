const test = require('node:test');
const assert = require('node:assert/strict');
const Alert = require('../models/Alert');
const { canAccessCustomer } = require('../utils/accessControl');
const requireRole = require('../middleware/requireRole');

const customer = { _id: 'c1', email: 'Jane@Example.com', garageId: 'g1', garageIds: ['g2'] };
let bookedAtGarage = false;
const originalExists = Alert.exists;
test.beforeEach(() => {
  bookedAtGarage = false;
  Alert.exists = async () => (bookedAtGarage ? { _id: 'a1' } : null);
});
test.after(() => {
  Alert.exists = originalExists;
});

test('platform admin can access any customer', async () => {
  assert.equal(await canAccessCustomer({ role: 'admin' }, customer), true);
});

test('a customer can only access their own record (by id or login email)', async () => {
  assert.equal(await canAccessCustomer({ role: 'customer', customerId: 'c1' }, customer), true);
  assert.equal(await canAccessCustomer({ role: 'customer', email: 'jane@example.com' }, customer), true);
  assert.equal(await canAccessCustomer({ role: 'customer', customerId: 'c2', email: 'other@example.com' }, customer), false);
});

test('garage staff can access customers linked to their garage or who booked there', async () => {
  assert.equal(await canAccessCustomer({ role: 'garage_admin', garageId: 'g1' }, customer), true);
  assert.equal(await canAccessCustomer({ role: 'staff', garageId: 'g2' }, customer), true);
  assert.equal(await canAccessCustomer({ role: 'staff', garageId: 'g9' }, customer), false);
  bookedAtGarage = true;
  assert.equal(await canAccessCustomer({ role: 'staff', garageId: 'g9' }, customer), true);
});

test('missing user, missing customer or unknown roles are denied', async () => {
  assert.equal(await canAccessCustomer(null, customer), false);
  assert.equal(await canAccessCustomer({ role: 'admin' }, null), false);
  assert.equal(await canAccessCustomer({ role: 'guest' }, customer), false);
  assert.equal(await canAccessCustomer({ role: 'staff' }, customer), false); // staff without a garage
});

test('requireRole lets listed roles through and blocks everyone else with 403', () => {
  const mw = requireRole('admin');
  let nextCalled = false;
  let status = null;
  const res = { status(code) { status = code; return this; }, json() { return this; } };

  mw({ user: { role: 'admin' } }, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);

  nextCalled = false;
  mw({ user: { role: 'customer' } }, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(status, 403);

  status = null;
  mw({}, res, () => { nextCalled = true; });
  assert.equal(status, 403);
});
