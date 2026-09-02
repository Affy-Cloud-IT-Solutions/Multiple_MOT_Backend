const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, alertController.getAllAlerts);
router.post('/', authMiddleware.optional, alertController.createAlert);
router.put('/:id/approve', authMiddleware, alertController.approveAlert);
router.put('/:id/acknowledge', authMiddleware, alertController.acknowledgeAlert);
router.put('/:id/reject', authMiddleware, alertController.rejectAlert);
router.put('/:id/reschedule', authMiddleware, alertController.rescheduleAlert);

module.exports = router;

