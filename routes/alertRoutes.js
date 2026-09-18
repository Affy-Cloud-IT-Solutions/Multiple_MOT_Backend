const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const authMiddleware = require('../middleware/auth');

const { verifySmtpConnection, sendDiagnosticTestEmail } = require('../services/emailService');

router.get('/', authMiddleware, alertController.getAllAlerts);
router.post('/', authMiddleware.optional, alertController.createAlert);
router.put('/:id/approve', authMiddleware, alertController.approveAlert);
router.put('/:id/acknowledge', authMiddleware, alertController.acknowledgeAlert);
router.put('/:id/reject', authMiddleware, alertController.rejectAlert);
router.put('/:id/reschedule', authMiddleware, alertController.rescheduleAlert);

// SMTP Test & Diagnostic Endpoint
router.all('/test-smtp', async (req, res) => {
  try {
    const to = req.body?.to || req.query?.to;
    if (to) {
      const result = await sendDiagnosticTestEmail(to);
      return res.status(result.success ? 200 : 500).json(result);
    }
    const diagnostic = await verifySmtpConnection();
    res.status(diagnostic.success ? 200 : 500).json(diagnostic);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

