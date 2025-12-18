import express from 'express';
import {
  submitFeedback,
  getAllFeedback,
  getFeedbackCount,
} from '../controllers/contactController.js';
import { authenticate, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/feedback', submitFeedback);
router.get('/feedback/count', getFeedbackCount);

// Admin route
router.get('/feedback', authenticate, isAdmin, getAllFeedback);

export default router;
