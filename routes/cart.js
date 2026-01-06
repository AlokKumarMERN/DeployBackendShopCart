import express from 'express';
import { getCart, updateCart, clearCart, syncCart } from '../controllers/cartController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Sync route - doesn't use middleware auth (token in body for sendBeacon)
router.post('/sync', syncCart);

// All other cart routes require authentication
router.use(authenticate);

router.get('/', getCart);
router.put('/', updateCart);
router.delete('/', clearCart);

export default router;
