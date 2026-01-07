import express from 'express';
import {
  getFilters,
  getAllFilters,
  createFilter,
  updateFilter,
  deleteFilter,
  addFilterOption,
  removeFilterOption,
} from '../controllers/filterController.js';
import { authenticate, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public route - get active filters
router.get('/', getFilters);

// Admin routes - require authentication and admin role
router.get('/admin', authenticate, isAdmin, getAllFilters);
router.post('/', authenticate, isAdmin, createFilter);
router.put('/:id', authenticate, isAdmin, updateFilter);
router.delete('/:id', authenticate, isAdmin, deleteFilter);
router.post('/:id/options', authenticate, isAdmin, addFilterOption);
router.delete('/:id/options/:optionId', authenticate, isAdmin, removeFilterOption);

export default router;
