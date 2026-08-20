const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, auditController.getAuditTrail);
router.post('/', auditController.createAuditLog);

module.exports = router;
