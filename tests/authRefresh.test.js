const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const authController = require('../controllers/authController');
const User = require('../models/User');
const Customer = require('../models/Customer');

// Same secrets the controller resolved at load time (env, or its defaults)
const JWT_SECRET = process.env.JWT_SECRET || 'mot_app_secure_secret_token_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'mot_app_secure_refresh_secret_2026';

const signRefresh = (userId, opts = { expiresIn: '30d' }) =>
  jwt.sign({ userId, email: 'jane@example.com', role: 'customer', nonce: Math.random() }, JWT_REFRESH_SECRET, opts);

function makeUser(overrides = {}) {
  const user = {
    _id: '64b7f0f0f0f0f0f0f0f0f0f1',
    email: 'jane@example.com',
    role: 'customer',
    username: 'jane',
    customerId: null,
    garageId: null,
    refreshToken: null,
    previousRefreshToken: null,
    refreshTokenRotatedAt: null,
    saves: 0,
    async save() {
      this.saves += 1;
    },
    ...overrides
  };
  return user;
}

function callRefresh(body) {
  return new Promise(resolve => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resolve({ status: this.statusCode, body: payload });
      }
    };
    authController.refreshToken({ body }, res);
  });
}

let currentUser;
const originalFindById = User.findById;
const originalCustFindById = Customer.findById;
const originalCustFindOne = Customer.findOne;
const originalFindOneAndUpdate = User.findOneAndUpdate;

test.beforeEach(() => {
  User.findById = async () => currentUser;
  Customer.findById = async () => null;
  Customer.findOne = async () => null;
});

test.after(() => {
  User.findById = originalFindById;
  Customer.findById = originalCustFindById;
  Customer.findOne = originalCustFindOne;
  User.findOneAndUpdate = originalFindOneAndUpdate;
});

test('current refresh token: issues a new access token and rotates the refresh token', async () => {
  const rt = signRefresh('64b7f0f0f0f0f0f0f0f0f0f1');
  currentUser = makeUser({ refreshToken: rt });

  const { status, body } = await callRefresh({ refreshToken: rt });
  assert.equal(status, 200);
  assert.ok(jwt.verify(body.accessToken, JWT_SECRET));
  assert.notEqual(body.refreshToken, rt);
  assert.equal(currentUser.refreshToken, body.refreshToken);
  assert.equal(currentUser.previousRefreshToken, rt);
  assert.equal(currentUser.saves, 1);
});

test('two refreshes with the same token (race): the second one succeeds and gets the latest refresh token', async () => {
  const rt = signRefresh('64b7f0f0f0f0f0f0f0f0f0f1');
  currentUser = makeUser({ refreshToken: rt });

  const first = await callRefresh({ refreshToken: rt });
  const second = await callRefresh({ refreshToken: rt });

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.ok(jwt.verify(second.body.accessToken, JWT_SECRET));
  // No second rotation: both callers end up holding the same, current refresh token
  assert.equal(second.body.refreshToken, first.body.refreshToken);
  assert.equal(currentUser.refreshToken, first.body.refreshToken);
  assert.equal(currentUser.saves, 1);
});

test('replaced refresh token after the grace window is rejected as revoked', async () => {
  const oldRt = signRefresh('64b7f0f0f0f0f0f0f0f0f0f1');
  currentUser = makeUser({
    refreshToken: signRefresh('64b7f0f0f0f0f0f0f0f0f0f1'),
    previousRefreshToken: oldRt,
    refreshTokenRotatedAt: new Date(Date.now() - 3 * 60 * 1000)
  });

  const { status, body } = await callRefresh({ refreshToken: oldRt });
  assert.equal(status, 403);
  assert.equal(body.code, 'REFRESH_TOKEN_REVOKED');
});

test('an unknown (older) refresh token is rejected as revoked', async () => {
  currentUser = makeUser({
    refreshToken: signRefresh('64b7f0f0f0f0f0f0f0f0f0f1'),
    previousRefreshToken: signRefresh('64b7f0f0f0f0f0f0f0f0f0f1'),
    refreshTokenRotatedAt: new Date()
  });
  const { status, body } = await callRefresh({ refreshToken: signRefresh('64b7f0f0f0f0f0f0f0f0f0f1') });
  assert.equal(status, 403);
  assert.equal(body.code, 'REFRESH_TOKEN_REVOKED');
});

test('an expired refresh token is rejected with 401 REFRESH_TOKEN_EXPIRED', async () => {
  currentUser = makeUser();
  const expired = signRefresh('64b7f0f0f0f0f0f0f0f0f0f1', { expiresIn: -10 });
  const { status, body } = await callRefresh({ refreshToken: expired });
  assert.equal(status, 401);
  assert.equal(body.code, 'REFRESH_TOKEN_EXPIRED');
});

test('isWithinRotationGrace only matches the replaced token inside the window', () => {
  const now = Date.now();
  const user = { previousRefreshToken: 'old', refreshTokenRotatedAt: new Date(now - 60 * 1000) };
  assert.equal(authController.isWithinRotationGrace(user, 'old', now), true);
  assert.equal(authController.isWithinRotationGrace(user, 'other', now), false);
  assert.equal(authController.isWithinRotationGrace({ ...user, refreshTokenRotatedAt: new Date(now - 10 * 60 * 1000) }, 'old', now), false);
  assert.equal(authController.isWithinRotationGrace({ previousRefreshToken: null }, null, now), false);
});

test('logout by refresh token also revokes the grace (previous) token', async () => {
  let query;
  let update;
  User.findOneAndUpdate = async (q, u) => {
    query = q;
    update = u;
  };
  await new Promise(resolve => {
    authController.logout({ body: { refreshToken: 'rt' } }, { status() { return this; }, json: resolve });
  });
  assert.deepEqual(query, { $or: [{ refreshToken: 'rt' }, { previousRefreshToken: 'rt' }] });
  assert.deepEqual(update, { refreshToken: null, previousRefreshToken: null });
});
