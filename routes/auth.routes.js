const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');
const {
  validateRegister,
  validateUpdateProfile
} = require('../middleware/validate');

// ===========================================
// Routes
// ===========================================
router.post('/register', authLimiter, validateRegister, authController.register);
router.post('/login', authLimiter, authController.login);

// محمي
router.get('/me', verifyToken, authController.getMe);
router.put('/profile', verifyToken, validateUpdateProfile, authController.updateProfile);

module.exports = router;
