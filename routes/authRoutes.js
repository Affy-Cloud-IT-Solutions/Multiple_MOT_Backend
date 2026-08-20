const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.post('/login', authController.login);
router.post('/signup', authController.signup);
router.post('/create-staff', authMiddleware, authController.createStaff);
router.get('/staff', authMiddleware, authController.getStaffList);
router.delete('/staff/:id', authMiddleware, authController.deleteStaff);
router.get('/profile', authMiddleware, authController.getProfile);

module.exports = router;
