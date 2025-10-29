import express from 'express';
import {
  submitFeedback,
  getAllFeedback,
} from '../controllers/contactController.js';
import { authenticate, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public route
router.post('/feedback', submitFeedback);

// Admin route
router.get('/feedback', authenticate, isAdmin, getAllFeedback);

export default router;
