const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const { validateRegister, validateUpdateProfile } = require('../middleware/validate');

router.post('/register', authLimiter, validateRegister, authController.register);
router.post('/login', authLimiter, authController.login);
router.get('/me', verifyToken, authController.getMe);
router.put('/profile', verifyToken, validateUpdateProfile, authController.updateProfile);

module.exports = router;
