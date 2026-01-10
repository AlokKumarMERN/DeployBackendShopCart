import express from 'express';
import { body } from 'express-validator';
import passport from '../config/passport.js';
import {
  signup,
  login,
  getProfile,
  updateAddresses,
  googleAuthSuccess,
  forgotPassword,
  resetPassword,
  verifyResetToken,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist,
  getNotifications,
  getNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  getSettings,
  updateSettings,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Validation rules
const signupValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Routes
router.post('/signup', signupValidation, signup);
router.post('/login', loginValidation, login);
router.get('/profile', authenticate, getProfile);
router.put('/addresses', authenticate, updateAddresses);

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/verify-reset-token/:token', verifyResetToken);

// Wishlist routes
router.get('/wishlist', authenticate, getWishlist);
router.get('/wishlist/check/:productId', authenticate, checkWishlist);
router.post('/wishlist/:productId', authenticate, addToWishlist);
router.delete('/wishlist/:productId', authenticate, removeFromWishlist);

// Notifications routes
router.get('/notifications', authenticate, getNotifications);
router.get('/notifications/count', authenticate, getNotificationCount);
router.put('/notifications/read-all', authenticate, markAllNotificationsRead);
router.put('/notifications/:notificationId/read', authenticate, markNotificationRead);
router.delete('/notifications/:notificationId', authenticate, deleteNotification);

// Settings routes
router.get('/settings', authenticate, getSettings);
router.put('/settings', authenticate, updateSettings);

// Google OAuth routes - only enable if credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  router.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  router.get(
    '/google/callback',
    passport.authenticate('google', { 
      failureRedirect: process.env.FRONTEND_URL + '/login?error=google_auth_failed',
      session: false 
    }),
    googleAuthSuccess
  );
} else {
  // Fallback route when Google OAuth is not configured
  router.get('/google', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Google OAuth is not configured on this server. Please use email/password login or contact the administrator.',
    });
  });
  
  router.get('/google/callback', (req, res) => {
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendURL}/login?error=google_oauth_not_configured`);
  });
}

export default router;
