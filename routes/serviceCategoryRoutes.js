const express = require('express');
const router = express.Router();
const serviceCategoryController = require('../controllers/serviceCategoryController');
const authMiddleware = require('../middleware/auth');

// Public route: fetch all active categories
router.get('/', serviceCategoryController.getServiceCategories);

// Super Admin protected routes: create, update, delete categories
router.post('/', authMiddleware, serviceCategoryController.createServiceCategory);
router.put('/:id', authMiddleware, serviceCategoryController.updateServiceCategory);
router.delete('/:id', authMiddleware, serviceCategoryController.deleteServiceCategory);

module.exports = router;
