const express = require('express');
const router = express.Router();
const responseController = require('../controllers/responseController');

// Token link generation (used by admin dashboard or templates)
router.post('/generate-link', responseController.generateTokenLink);

// Customer portal entry (verifies Base64 token link)
router.get('/portal', responseController.verifyPortalToken);

// Customer actions (marks sold, books MOT, adds new vehicle)
router.post('/portal/action', responseController.executeAction);

module.exports = router;
