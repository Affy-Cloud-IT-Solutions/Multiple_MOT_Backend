const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { getPlatformConfig, updatePlatformConfig } = require('../controllers/platformSettingController');

router.get('/', getPlatformConfig);
router.patch('/', auth, requireRole('admin'), updatePlatformConfig);

module.exports = router;

