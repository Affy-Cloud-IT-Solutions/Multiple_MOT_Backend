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

function callLogout(body, user) {
  return new Promise(resolve => {
    authController.logout({ body, user }, { status() { return this; }, json: resolve });
  });
}

test('signing in on a second device keeps the first device signed in (per-device sessions)', async () => {
  currentUser = makeUser({ refreshSessions: [] });
  const deviceA = await authController.generateTokens(currentUser, null, null);
  const deviceB = await authController.generateTokens(currentUser, null, null);
  assert.notEqual(deviceA.refreshToken, deviceB.refreshToken, 'every refresh token is unique');
  assert.equal(currentUser.refreshSessions.length, 2);

  // Device A refreshes long after device B signed in - still valid
  const a = await callRefresh({ refreshToken: deviceA.refreshToken });
  assert.equal(a.status, 200);
  // Device B is unaffected by A's rotation
  const b = await callRefresh({ refreshToken: deviceB.refreshToken });
  assert.equal(b.status, 200);
  assert.equal(currentUser.refreshSessions.length, 2);
  assert.ok(currentUser.refreshSessions.some(s => s.token === a.body.refreshToken));
  assert.ok(currentUser.refreshSessions.some(s => s.token === b.body.refreshToken));
});

test('per-device grace: a just-rotated token returns that device\'s current token without rotating again', async () => {
  currentUser = makeUser({ refreshSessions: [] });
  const device = await authController.generateTokens(currentUser, null, null);
  const first = await callRefresh({ refreshToken: device.refreshToken });
  const retry = await callRefresh({ refreshToken: device.refreshToken });
  assert.equal(retry.status, 200);
  assert.equal(retry.body.refreshToken, first.body.refreshToken);
  assert.equal(currentUser.refreshSessions.length, 1);
});

test('a device token outside the grace window is rejected', async () => {
  const old = signRefresh('64b7f0f0f0f0f0f0f0f0f0f1');
  currentUser = makeUser({
    refreshSessions: [{ token: signRefresh('64b7f0f0f0f0f0f0f0f0f0f1'), previousToken: old, rotatedAt: new Date(Date.now() - 5 * 60 * 1000), createdAt: new Date() }]
  });
  const { status, body } = await callRefresh({ refreshToken: old });
  assert.equal(status, 403);
  assert.equal(body.code, 'REFRESH_TOKEN_REVOKED');
});

test('tokens issued before per-device sessions still refresh and are migrated into a session', async () => {
  const legacy = signRefresh('64b7f0f0f0f0f0f0f0f0f0f1');
  currentUser = makeUser({ refreshToken: legacy, refreshSessions: [] });
  const { status, body } = await callRefresh({ refreshToken: legacy });
  assert.equal(status, 200);
  assert.equal(currentUser.refreshSessions.length, 1);
  assert.equal(currentUser.refreshSessions[0].token, body.refreshToken);
});

test('only the most recent sessions are kept', async () => {
  currentUser = makeUser({ refreshSessions: [] });
  for (let i = 0; i < 12; i++) await authController.generateTokens(currentUser, null, null);
  assert.equal(currentUser.refreshSessions.length, 10);
});

test('logout signs out only this device; other devices keep working', async () => {
  currentUser = makeUser({ refreshSessions: [] });
  const deviceA = await authController.generateTokens(currentUser, null, null);
  const deviceB = await authController.generateTokens(currentUser, null, null);
  const originalFindOne = User.findOne;
  User.findOne = async () => currentUser;
  try {
    await callLogout({ refreshToken: deviceA.refreshToken });
  } finally {
    User.findOne = originalFindOne;
  }
  assert.equal(currentUser.refreshSessions.length, 1);
  assert.equal((await callRefresh({ refreshToken: deviceA.refreshToken })).status, 403);
  assert.equal((await callRefresh({ refreshToken: deviceB.refreshToken })).status, 200);
});

test('logout without a device token signs out every device', async () => {
  let update;
  const originalFindByIdAndUpdate = User.findByIdAndUpdate;
  User.findByIdAndUpdate = async (id, u) => { update = u; };
  try {
    await callLogout({}, { userId: 'u1' });
  } finally {
    User.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
  assert.deepEqual(update, { refreshToken: null, previousRefreshToken: null, refreshSessions: [] });
});
