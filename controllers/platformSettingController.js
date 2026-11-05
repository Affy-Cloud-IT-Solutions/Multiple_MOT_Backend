const PlatformSetting = require('../models/PlatformSetting');
const Audit = require('../models/Audit');
const { getPlatformSettings, clearSettingsCache } = require('../utils/platformSettings');

async function getPlatformConfig(req, res) {
  try {
    const settings = await getPlatformSettings();
    res.json({
      requireFullProfileForVisibility: Boolean(settings.requireFullProfileForVisibility)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function updatePlatformConfig(req, res) {
  try {
    const { requireFullProfileForVisibility } = req.body;
    if (typeof requireFullProfileForVisibility !== 'boolean') {
      return res.status(400).json({ error: 'requireFullProfileForVisibility must be a boolean.' });
    }

    let setting = await PlatformSetting.findOne({ key: 'platform_config' });
    if (!setting) {
      setting = new PlatformSetting({ key: 'platform_config' });
    }

    setting.requireFullProfileForVisibility = requireFullProfileForVisibility;
    setting.updatedBy = req.user?._id;
    await setting.save();
    clearSettingsCache();

    if (Audit && typeof Audit.create === 'function') {
      await Audit.create({
        activity: 'Platform Setting Updated',
        details: `Super Admin "${req.user?.name || req.user?.username || 'Admin'}" set requireFullProfileForVisibility to ${requireFullProfileForVisibility}.`
      }).catch(err => console.error('[Audit Error]:', err.message));
    }

    res.json({
      message: 'Platform settings updated successfully.',
      requireFullProfileForVisibility: setting.requireFullProfileForVisibility
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getPlatformConfig,
  updatePlatformConfig
};
