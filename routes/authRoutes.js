const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

const { verifySmtpConnection, sendDiagnosticTestEmail } = require('../services/emailService');

router.post('/login', authController.customerLogin);
router.post('/admin/login', authController.adminLogin);
router.post('/signup', authController.signup);
router.post('/create-staff', authMiddleware, authController.createStaff);
router.get('/staff', authMiddleware, authController.getStaffList);
router.delete('/staff/:id', authMiddleware, authController.deleteStaff);
router.get('/profile', authMiddleware, authController.getProfile);

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
