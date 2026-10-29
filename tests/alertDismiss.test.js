const test = require('node:test');
const assert = require('node:assert/strict');
const alertController = require('../controllers/alertController');
const Alert = require('../models/Alert');

const CUSTOMER_ID = '64b7f0f0f0f0f0f0f0f0f0a1';

function makeAlert(overrides = {}) {
  const doc = new Alert({
    type: 'BOOKED',
    customerName: 'Jane Doe',
    customerId: CUSTOMER_ID,
    customerEmail: 'jane@example.com',
    registrationNumber: 'AB12CDE',
    status: 'Rejected',
    rejectionReason: 'Fully booked',
    ...overrides
  });
  doc.saves = 0;
  doc.save = async function () {
    this.saves += 1;
    return this;
  };
  return doc;
}

function callDismiss(user, id = 'a1') {
  return new Promise(resolve => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        resolve({ status: this.statusCode, body });
      }
    };
    alertController.dismissAlertForCustomer({ params: { id }, user }, res);
  });
}

let currentAlert;
const originalFindById = Alert.findById;
test.beforeEach(() => {
  Alert.findById = async () => currentAlert;
});
test.after(() => {
  Alert.findById = originalFindById;
});

test('the owning customer can dismiss a rejected booking notification without changing its status', async () => {
  currentAlert = makeAlert();
  const { status, body } = await callDismiss({ role: 'customer', customerId: CUSTOMER_ID, email: 'jane@example.com' });
  assert.equal(status, 200);
  assert.ok(currentAlert.customerDismissedAt instanceof Date);
  assert.equal(currentAlert.status, 'Rejected');
  assert.equal(currentAlert.saves, 1);
  assert.equal(body.alert.status, 'Rejected');
});

test('dismissing twice is a no-op (idempotent)', async () => {
  const first = new Date('2026-01-01');
  currentAlert = makeAlert({ customerDismissedAt: first });
  const { status } = await callDismiss({ role: 'customer', customerId: CUSTOMER_ID });
  assert.equal(status, 200);
  assert.equal(currentAlert.saves, 0);
  assert.equal(currentAlert.customerDismissedAt.getTime(), first.getTime());
});

test('another customer cannot dismiss it', async () => {
  currentAlert = makeAlert();
  const { status } = await callDismiss({ role: 'customer', customerId: '64b7f0f0f0f0f0f0f0f0f0ff', email: 'other@example.com' });
  assert.equal(status, 403);
  assert.equal(currentAlert.customerDismissedAt, null);
});

test('alerts without a customerId are matched by the customer email', async () => {
  currentAlert = makeAlert({ customerId: undefined, customerEmail: 'Jane@Example.com' });
  const ok = await callDismiss({ role: 'customer', email: 'jane@example.com' });
  assert.equal(ok.status, 200);

  currentAlert = makeAlert({ customerId: undefined, customerEmail: 'jane@example.com' });
  const denied = await callDismiss({ role: 'customer', email: 'someone@example.com' });
  assert.equal(denied.status, 403);
});

test('non-customer roles are rejected and unknown alerts return 404', async () => {
  currentAlert = makeAlert();
  assert.equal((await callDismiss({ role: 'garage_admin', garageId: 'g1' })).status, 403);
  currentAlert = null;
  assert.equal((await callDismiss({ role: 'customer', customerId: CUSTOMER_ID })).status, 404);
});
