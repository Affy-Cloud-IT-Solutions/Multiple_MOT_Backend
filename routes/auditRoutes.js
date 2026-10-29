const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// The audit trail holds customer names and plates - staff and admins only
router.get('/', authMiddleware, requireRole('admin', 'garage_admin', 'staff'), auditController.getAuditTrail);
// Logged-in users only (previously anyone could write fake audit entries)
router.post('/', authMiddleware, auditController.createAuditLog);

module.exports = router;
