import express from 'express';
import {
  getProducts,
  getProductById,
  searchProducts,
  getProductsByCategory,
  addProductReview,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
} from '../controllers/productController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getProducts);
router.get('/search', searchProducts);
router.get('/category/:category', getProductsByCategory);
router.get('/:id', getProductById);

// Protected routes
router.post('/:id/reviews', authenticate, addProductReview);

// Admin routes
router.get('/admin/stats', authenticate, getProductStats);
router.post('/', authenticate, createProduct);
router.put('/:id', authenticate, updateProduct);
router.delete('/:id', authenticate, deleteProduct);

export default router;
