const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const authMiddleware = require('../middleware/auth');

// DVLA lookup (accessible by authenticated users, e.g. when checking on main dashboard)
router.get('/dvla/:vrn', authMiddleware, vehicleController.lookupDVLA);

router.get('/makes', authMiddleware, vehicleController.getMakes);
router.get('/models', authMiddleware, vehicleController.getModels);

router.get('/', authMiddleware, vehicleController.getAllVehicles);
router.get('/:id', authMiddleware, vehicleController.getVehicleById);
router.post('/', authMiddleware, vehicleController.createVehicle);
router.put('/:id', authMiddleware, vehicleController.updateVehicle);
router.delete('/:id', authMiddleware, vehicleController.deleteVehicle);

module.exports = router;
