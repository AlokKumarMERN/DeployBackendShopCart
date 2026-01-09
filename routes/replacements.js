import express from 'express';
import {
  checkReplacementEligibility,
  requestReplacement,
  getUserReplacements,
  getAllReplacements,
  getReplacementById,
  updateReplacement,
  getReplacementStats,
} from '../controllers/replacementController.js';
import { authenticate, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// User routes
router.get('/check/:orderId/:productId', authenticate, checkReplacementEligibility);
router.post('/', authenticate, requestReplacement);
router.get('/', authenticate, getUserReplacements);
router.get('/:id', authenticate, getReplacementById);

// Admin routes
router.get('/admin/all', authenticate, isAdmin, getAllReplacements);
router.get('/admin/stats', authenticate, isAdmin, getReplacementStats);
router.put('/:id', authenticate, isAdmin, updateReplacement);

export default router;
