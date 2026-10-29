const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// Reminder logs and templates are platform-wide; triggering the job sends real reminders - admins only
router.get('/logs', authMiddleware, requireRole('admin'), reminderController.getReminderLogs);
router.get('/templates', authMiddleware, requireRole('admin', 'garage_admin', 'staff'), reminderController.getTemplates);
router.put('/templates', authMiddleware, requireRole('admin'), reminderController.updateTemplate);

// Manual trigger for the daily reminder scanner
router.post('/trigger-cron', authMiddleware, requireRole('admin'), reminderController.triggerReminderCron);

module.exports = router;
