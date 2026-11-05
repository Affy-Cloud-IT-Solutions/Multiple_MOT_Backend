const test = require('node:test');
const assert = require('node:assert/strict');
const { getPlatformConfig, updatePlatformConfig } = require('../controllers/platformSettingController');
const PlatformSetting = require('../models/PlatformSetting');
const Audit = require('../models/Audit');
const { clearSettingsCache } = require('../utils/platformSettings');

function mockResponse() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

test('Platform Setting: getPlatformConfig returns default requireFullProfileForVisibility = false', async () => {
  clearSettingsCache();
  const originalFindOne = PlatformSetting.findOne;
  const originalCreate = PlatformSetting.create;

  try {
    PlatformSetting.findOne = async () => null;
    PlatformSetting.create = async (data) => ({ ...data, toObject: () => data });

    const req = {};
    const res = mockResponse();
    await getPlatformConfig(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.requireFullProfileForVisibility, false);
  } finally {
    PlatformSetting.findOne = originalFindOne;
    PlatformSetting.create = originalCreate;
    clearSettingsCache();
  }
});

test('Platform Setting: updatePlatformConfig updates toggle and validates input', async () => {
  clearSettingsCache();
  const originalFindOne = PlatformSetting.findOne;
  const originalAuditCreate = Audit.create;

  try {
    Audit.create = async () => ({});
    let savedDoc = null;
    PlatformSetting.findOne = async () => ({
      key: 'platform_config',
      requireFullProfileForVisibility: false,
      save: async function () {
        savedDoc = this;
        return this;
      }
    });

    // 1. Invalid input check
    const badReq = { body: { requireFullProfileForVisibility: 'yes' }, user: { _id: 'admin1', role: 'admin' } };
    const badRes = mockResponse();
    await updatePlatformConfig(badReq, badRes);
    assert.equal(badRes.statusCode, 400);

    // 2. Valid update check (turn ON mandatory mode)
    const req = { body: { requireFullProfileForVisibility: true }, user: { _id: 'admin1', role: 'admin', username: 'SuperAdmin' } };
    const res = mockResponse();
    await updatePlatformConfig(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.requireFullProfileForVisibility, true);
    assert.equal(savedDoc.requireFullProfileForVisibility, true);
  } finally {
    PlatformSetting.findOne = originalFindOne;
    Audit.create = originalAuditCreate;
    clearSettingsCache();
  }
});
