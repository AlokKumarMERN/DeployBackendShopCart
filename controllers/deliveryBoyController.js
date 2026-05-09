import DeliveryBoy from '../models/DeliveryBoy.js';
import Order from '../models/Order.js';

// @desc    Get all delivery boys
// @route   GET /api/delivery-boys
// @access  Private/Admin
export const getAllDeliveryBoys = async (req, res) => {
  try {
    const deliveryBoys = await DeliveryBoy.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: deliveryBoys,
    });
  } catch (error) {
    console.error('Error fetching delivery boys:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get single delivery boy
// @route   GET /api/delivery-boys/:id
// @access  Private/Admin
export const getDeliveryBoyById = async (req, res) => {
  try {
    const deliveryBoy = await DeliveryBoy.findById(req.params.id)
      .populate('assignedOrders');
    
    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: 'Delivery boy not found',
      });
    }
    
    res.status(200).json({
      success: true,
      data: deliveryBoy,
    });
  } catch (error) {
    console.error('Error fetching delivery boy:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Create delivery boy
// @route   POST /api/delivery-boys
// @access  Private/Admin
export const createDeliveryBoy = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      address,
      city,
      state,
      vehicleType,
      vehicleNumber,
    } = req.body;

    // Check if phone or email already exists
    const existingBoy = await DeliveryBoy.findOne({
      $or: [{ phone }, { email }]
    });

    if (existingBoy) {
      return res.status(400).json({
        success: false,
        message: 'Delivery boy with this phone or email already exists',
      });
    }

    const deliveryBoy = await DeliveryBoy.create({
      name,
      phone,
      email,
      address,
      city,
      state,
      vehicleType,
      vehicleNumber,
    });
    
    res.status(201).json({
      success: true,
      data: deliveryBoy,
      message: 'Delivery boy created successfully',
    });
  } catch (error) {
    console.error('Error creating delivery boy:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Update delivery boy
// @route   PUT /api/delivery-boys/:id
// @access  Private/Admin
export const updateDeliveryBoy = async (req, res) => {
  try {
    const deliveryBoy = await DeliveryBoy.findById(req.params.id);
    
    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: 'Delivery boy not found',
      });
    }

    const allowedUpdates = [
      'name',
      'phone',
      'email',
      'address',
      'city',
      'state',
      'vehicleType',
      'vehicleNumber',
      'isActive',
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        deliveryBoy[field] = req.body[field];
      }
    });

    await deliveryBoy.save();
    
    res.status(200).json({
      success: true,
      data: deliveryBoy,
      message: 'Delivery boy updated successfully',
    });
  } catch (error) {
    console.error('Error updating delivery boy:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Delete delivery boy
// @route   DELETE /api/delivery-boys/:id
// @access  Private/Admin
export const deleteDeliveryBoy = async (req, res) => {
  try {
    const deliveryBoy = await DeliveryBoy.findById(req.params.id);
    
    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: 'Delivery boy not found',
      });
    }

    // Check if delivery boy has assigned orders
    const assignedOrders = await Order.countDocuments({
      deliveryBoy: req.params.id,
      orderStatus: { $in: ['Processing', 'Shipped'] }
    });

    if (assignedOrders > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete delivery boy with active assigned orders',
      });
    }

    await deliveryBoy.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Delivery boy deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting delivery boy:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get active delivery boys
// @route   GET /api/delivery-boys/active
// @access  Private/Admin
export const getActiveDeliveryBoys = async (req, res) => {
  try {
    const deliveryBoys = await DeliveryBoy.find({ isActive: true })
      .sort({ name: 1 });
    
    res.status(200).json({
      success: true,
      data: deliveryBoys,
    });
  } catch (error) {
    console.error('Error fetching active delivery boys:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
