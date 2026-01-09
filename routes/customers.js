import express from 'express';
import {
  getAllCustomers,
  getCustomerDetails,
  getMatchingCustomers,
  getCustomerStats,
} from '../controllers/customerController.js';
import { authenticate, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require admin access
router.use(authenticate);
router.use(isAdmin);

router.get('/admin', getAllCustomers);
router.get('/admin/stats', getCustomerStats);
router.post('/admin/match-criteria', getMatchingCustomers);
router.get('/admin/:id', getCustomerDetails);

export default router;
