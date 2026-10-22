const express = require('express');
const router = express.Router();
const garageController = require('../controllers/garageController');
const authMiddleware = require('../middleware/auth');

// Public route for onboarding/registration & application status checks
router.post('/register', garageController.registerGarage);
router.get('/check-status/:email', garageController.checkGarageStatusByEmail);
router.put('/:id/documents/:docId/resubmit', garageController.resubmitGarageDocument);

// Public templates catalog route (must be before /:id)
router.get('/templates/catalog', garageController.getServiceCatalogTemplates);

// Authenticated / public garage routes
router.get('/', authMiddleware.optional, garageController.getGarages);
router.get('/:id', authMiddleware.optional, garageController.getGarageById);
router.put('/:id', authMiddleware, garageController.updateGarage);
router.post('/:id/upload-documents', authMiddleware, garageController.uploadGarageDocs);
router.post('/:id/submit-for-review', authMiddleware, garageController.submitGarageForReview);
router.put('/:id/status', authMiddleware, garageController.updateGarageStatus);
router.put('/:id/documents/:docId/status', authMiddleware, garageController.updateGarageDocumentStatus);
router.get('/:id/slots', authMiddleware.optional, garageController.getGarageSlots);
router.post('/:id/stations', authMiddleware, garageController.addGarageStation);
router.put('/:id/stations/:stationId/status', authMiddleware, garageController.updateGarageStationStatus);
router.post('/:id/block-slot', authMiddleware, garageController.blockGarageSlot);
router.post('/:id/unblock-slot', authMiddleware, garageController.unblockGarageSlot);

// Dynamic Services Routes
router.get('/:id/services', authMiddleware.optional, garageController.getGarageServices);
router.post('/:id/services', authMiddleware, garageController.addGarageService);
router.post('/:id/services/seed-defaults', authMiddleware, garageController.seedGarageDefaultServices);
router.put('/:id/services/:serviceId', authMiddleware, garageController.updateGarageService);
router.delete('/:id/services/:serviceId', authMiddleware, garageController.deleteGarageService);

module.exports = router;
