const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// Public route: fetch all dynamic services
router.get('/', serviceController.getAllServices);
router.get('/catalog-grouped', serviceController.getCatalogGrouped);

// Super Admin Custom Service Moderation
router.get('/pending-custom', authMiddleware, requireRole('admin'), serviceController.getPendingCustomServices);
router.put('/:id/approve', authMiddleware, requireRole('admin'), serviceController.approveCustomService);
router.put('/:id/reject', authMiddleware, requireRole('admin'), serviceController.rejectCustomService);

router.get('/:id', serviceController.getServiceById);

// Admin-protected routes: manage platform services
router.post('/', authMiddleware, requireRole('admin'), serviceController.createService);
router.put('/:id', authMiddleware, requireRole('admin'), serviceController.updateService);
router.delete('/:id', authMiddleware, requireRole('admin'), serviceController.deleteService);

module.exports = router;
