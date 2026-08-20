const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const authMiddleware = require('../middleware/auth');

// Route for advanced filtering searches (should go before parameterized route :id)
router.get('/search', authMiddleware, customerController.searchCustomers);

router.get('/', authMiddleware, customerController.getAllCustomers);
router.get('/:id', authMiddleware, customerController.getCustomerById);
router.post('/', authMiddleware, customerController.createCustomer);
router.put('/:id', authMiddleware, customerController.updateCustomer);
router.delete('/:id', authMiddleware, customerController.deleteCustomer);

module.exports = router;
