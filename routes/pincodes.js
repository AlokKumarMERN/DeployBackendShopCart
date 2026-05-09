import express from 'express';
import {
  getAllPinCodes,
  checkPinCode,
  createPinCode,
  updatePinCode,
  deletePinCode,
  bulkUploadPinCodes,
} from '../controllers/pinCodeController.js';
import { authenticate, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/check/:pincode', checkPinCode);
router.get('/', getAllPinCodes);

// Admin routes - require authentication and admin role
router.post('/', authenticate, isAdmin, createPinCode);
router.post('/bulk', authenticate, isAdmin, bulkUploadPinCodes);

router.route('/:id')
  .put(authenticate, isAdmin, updatePinCode)
  .delete(authenticate, isAdmin, deletePinCode);

export default router;
