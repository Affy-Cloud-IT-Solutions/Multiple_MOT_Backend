const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const authMiddleware = require('../middleware/auth');

// Public route: fetch all dynamic services
router.get('/', serviceController.getAllServices);
router.get('/:id', serviceController.getServiceById);

// Admin-protected routes: manage services
router.post('/', authMiddleware, serviceController.createService);
router.put('/:id', authMiddleware, serviceController.updateService);
router.delete('/:id', authMiddleware, serviceController.deleteService);
router.post('/seed', authMiddleware.optional, serviceController.seedDefaultServices);

module.exports = router;
