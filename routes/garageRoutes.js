const express = require('express');
const router = express.Router();
const garageController = require('../controllers/garageController');
const authMiddleware = require('../middleware/auth');

// Public route for onboarding/registration
router.post('/register', garageController.registerGarage);

// Authenticated routes
router.get('/', authMiddleware.optional, garageController.getGarages);
router.get('/:id', authMiddleware.optional, garageController.getGarageById);
router.put('/:id', authMiddleware, garageController.updateGarage);
router.post('/:id/upload-documents', authMiddleware, garageController.uploadGarageDocs);
router.put('/:id/status', authMiddleware, garageController.updateGarageStatus);
router.post('/:id/block-slot', authMiddleware, garageController.blockGarageSlot);

module.exports = router;
