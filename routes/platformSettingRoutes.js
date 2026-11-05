const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const { getPlatformConfig, updatePlatformConfig } = require('../controllers/platformSettingController');

router.get('/', getPlatformConfig);
router.patch('/', auth, requireRole(['admin']), updatePlatformConfig);

module.exports = router;

