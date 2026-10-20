const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, productController.getAll);
router.get('/featured', productController.getFeatured);
router.get('/:id', productController.getById);

module.exports = router;
