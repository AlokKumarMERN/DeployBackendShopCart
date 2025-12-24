import express from 'express';
import {
  getCategories,
  createCategory,
  deleteCategory,
} from '../controllers/categoryController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getCategories);

// Admin routes
router.post('/', authenticate, createCategory);
router.delete('/:id', authenticate, deleteCategory);

export default router;
