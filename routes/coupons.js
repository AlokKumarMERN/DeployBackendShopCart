import express from 'express';
import {
  getAllCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  applyCoupon,
  getCouponStats,
} from '../controllers/couponController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public routes - none, all coupon operations require authentication

// Protected routes
router.post('/apply', authenticate, applyCoupon);

// Admin routes
router.get('/admin', authenticate, getAllCoupons);
router.get('/admin/stats', authenticate, getCouponStats);
router.get('/admin/:id', authenticate, getCouponById);
router.post('/', authenticate, createCoupon);
router.put('/:id', authenticate, updateCoupon);
router.delete('/:id', authenticate, deleteCoupon);

export default router;
