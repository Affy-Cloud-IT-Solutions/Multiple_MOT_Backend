const PlatformSetting = require('../models/PlatformSetting');

let cachedSetting = null;
let lastFetch = 0;
const CACHE_TTL = 10000; // 10 seconds

async function getPlatformSettings() {
  const now = Date.now();
  if (cachedSetting && (now - lastFetch < CACHE_TTL)) {
    return cachedSetting;
  }
  try {
    let setting = await PlatformSetting.findOne({ key: 'platform_config' });
    if (!setting) {
      setting = await PlatformSetting.create({
        key: 'platform_config',
        requireFullProfileForVisibility: false
      });
    }
    cachedSetting = setting.toObject ? setting.toObject() : setting;
    lastFetch = now;
    return cachedSetting;
  } catch (err) {
    return cachedSetting || { requireFullProfileForVisibility: false };
  }
}

function clearSettingsCache() {
  cachedSetting = null;
  lastFetch = 0;
}

module.exports = {
  getPlatformSettings,
  clearSettingsCache
};

