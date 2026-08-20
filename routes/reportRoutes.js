const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/auth');

router.get('/due-mots', authMiddleware, reportController.getMOTDueReport);
router.get('/reminder-sent', authMiddleware, reportController.getReminderSentReport);
router.get('/customer-response', authMiddleware, reportController.getCustomerResponseReport);
router.get('/booked-mots', authMiddleware, reportController.getBookedMOTReport);

module.exports = router;
