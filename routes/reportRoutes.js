const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
// Reports contain customer data; garage roles are scoped to their garage, customers have no access
const staffOnly = requireRole('admin', 'garage_admin', 'staff');

router.get('/due-mots', authMiddleware, staffOnly, reportController.getMOTDueReport);
router.get('/reminder-sent', authMiddleware, staffOnly, reportController.getReminderSentReport);
router.get('/customer-response', authMiddleware, staffOnly, reportController.getCustomerResponseReport);
router.get('/booked-mots', authMiddleware, staffOnly, reportController.getBookedMOTReport);

module.exports = router;
