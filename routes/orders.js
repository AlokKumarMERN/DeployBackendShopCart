import express from 'express';
import {
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getOrderStats,
  getOrderInvoice,
  exportExactDeliveryOrders,
  exportNormalDeliveryOrders,
} from '../controllers/orderController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All order routes are protected
router.post('/', authenticate, createOrder);
router.get('/admin/stats', authenticate, getOrderStats);
router.get('/export/exact-delivery', authenticate, exportExactDeliveryOrders);
router.get('/export/normal-delivery', authenticate, exportNormalDeliveryOrders);
router.get('/', authenticate, getUserOrders);
router.get('/:id', authenticate, getOrderById);
router.get('/:id/invoice', authenticate, getOrderInvoice);
router.put('/:id/status', authenticate, updateOrderStatus);
router.put('/:id/cancel', authenticate, cancelOrder);

export default router;
