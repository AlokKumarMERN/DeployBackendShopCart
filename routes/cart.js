import express from 'express';
import { getCart, updateCart, clearCart } from '../controllers/cartController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All cart routes require authentication
router.use(authenticate);

router.get('/', getCart);
router.put('/', updateCart);
router.delete('/', clearCart);

export default router;
