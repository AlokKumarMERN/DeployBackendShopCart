import express from 'express';
import {
  getAllDeliveryBoys,
  getDeliveryBoyById,
  createDeliveryBoy,
  updateDeliveryBoy,
  deleteDeliveryBoy,
  getActiveDeliveryBoys,
} from '../controllers/deliveryBoyController.js';
import { authenticate, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require admin access
router.use(authenticate);
router.use(isAdmin);

router.route('/')
  .get(getAllDeliveryBoys)
  .post(createDeliveryBoy);

router.route('/active')
  .get(getActiveDeliveryBoys);

router.route('/:id')
  .get(getDeliveryBoyById)
  .put(updateDeliveryBoy)
  .delete(deleteDeliveryBoy);

export default router;
