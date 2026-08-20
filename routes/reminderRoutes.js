const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');
const authMiddleware = require('../middleware/auth');

router.get('/logs', authMiddleware, reminderController.getReminderLogs);
router.get('/templates', authMiddleware, reminderController.getTemplates);
router.put('/templates', authMiddleware, reminderController.updateTemplate);

// Manual trigger for the daily reminder scanner
router.post('/trigger-cron', authMiddleware, reminderController.triggerReminderCron);

module.exports = router;
