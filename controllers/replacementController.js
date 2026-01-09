import Replacement from '../models/Replacement.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

// @desc    Check if item is eligible for replacement
// @route   GET /api/replacements/check/:orderId/:productId
// @access  Private
export const checkReplacementEligibility = async (req, res) => {
  try {
    const { orderId, productId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check if order belongs to user
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Check if order is delivered
    if (order.orderStatus !== 'Delivered') {
      return res.status(400).json({
        success: false,
        message: 'Order must be delivered to request replacement',
        eligible: false,
      });
    }

    // Find the item in the order
    const orderItem = order.items.find(
      (item) => item.product.toString() === productId
    );

    if (!orderItem) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in order',
      });
    }

    // Get product to check replacement days
    const product = await Product.findById(productId);
    const replacementDays = product?.replacementDays || 0;

    if (replacementDays === 0) {
      return res.json({
        success: true,
        eligible: false,
        message: 'Replacement is not available for this product',
        replacementDays: 0,
      });
    }

    // Calculate if within replacement window
    const deliveryDate = order.deliveryDate || order.updatedAt;
    const deadline = new Date(deliveryDate);
    deadline.setDate(deadline.getDate() + replacementDays);

    const now = new Date();
    const daysRemaining = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

    // Check if already requested replacement for this item
    const existingReplacement = await Replacement.findOne({
      order: orderId,
      'item.product': productId,
      status: { $nin: ['Rejected', 'Completed', 'Refunded'] },
    });

    if (existingReplacement) {
      return res.json({
        success: true,
        eligible: false,
        message: 'Replacement already requested for this item',
        existingRequest: existingReplacement,
      });
    }

    const eligible = now <= deadline;

    res.json({
      success: true,
      eligible,
      replacementDays,
      deliveryDate,
      deadline,
      daysRemaining: Math.max(0, daysRemaining),
      message: eligible
        ? `You have ${daysRemaining} day(s) left to request replacement`
        : 'Replacement period has expired',
    });
  } catch (error) {
    console.error('Check replacement eligibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Request replacement for an item
// @route   POST /api/replacements
// @access  Private
export const requestReplacement = async (req, res) => {
  try {
    const { orderId, productId, reason, description, images } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check if order belongs to user
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Check if order is delivered
    if (order.orderStatus !== 'Delivered') {
      return res.status(400).json({
        success: false,
        message: 'Order must be delivered to request replacement',
      });
    }

    // Find the item in the order
    const orderItem = order.items.find(
      (item) => item.product.toString() === productId
    );

    if (!orderItem) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in order',
      });
    }

    // Get product to check replacement days
    const product = await Product.findById(productId);
    const replacementDays = product?.replacementDays || 0;

    if (replacementDays === 0) {
      return res.status(400).json({
        success: false,
        message: 'Replacement is not available for this product',
      });
    }

    // Calculate if within replacement window
    const deliveryDate = order.deliveryDate || order.updatedAt;
    const deadline = new Date(deliveryDate);
    deadline.setDate(deadline.getDate() + replacementDays);

    if (new Date() > deadline) {
      return res.status(400).json({
        success: false,
        message: 'Replacement period has expired',
      });
    }

    // Check if already requested replacement for this item
    const existingReplacement = await Replacement.findOne({
      order: orderId,
      'item.product': productId,
      status: { $nin: ['Rejected', 'Completed', 'Refunded'] },
    });

    if (existingReplacement) {
      return res.status(400).json({
        success: false,
        message: 'Replacement already requested for this item',
      });
    }

    // Create replacement request
    const replacement = await Replacement.create({
      order: orderId,
      user: req.user._id,
      item: {
        product: productId,
        name: orderItem.name,
        image: orderItem.image,
        price: orderItem.price,
        quantity: orderItem.quantity,
        size: orderItem.size,
      },
      reason,
      description,
      images: images || [],
      deliveryDate,
      replacementDeadline: deadline,
      pickup: {
        address: order.shippingAddress,
      },
      timeline: [
        {
          status: 'Requested',
          message: 'Replacement request submitted',
          updatedBy: 'user',
        },
      ],
    });

    // Add notification to user
    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        notifications: {
          title: 'Replacement Request Submitted',
          message: `Your replacement request for ${orderItem.name} has been submitted. We will review it shortly.`,
          type: 'order',
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Replacement request submitted successfully',
      data: replacement,
    });
  } catch (error) {
    console.error('Request replacement error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get user's replacement requests
// @route   GET /api/replacements
// @access  Private
export const getUserReplacements = async (req, res) => {
  try {
    const replacements = await Replacement.find({ user: req.user._id })
      .populate('order', 'orderStatus grandTotal orderDate itemsTotal deliveryFee couponCode couponDiscount items')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: replacements,
    });
  } catch (error) {
    console.error('Get user replacements error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get all replacement requests (Admin)
// @route   GET /api/replacements/admin
// @access  Private/Admin
export const getAllReplacements = async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};

    const replacements = await Replacement.find(query)
      .populate('user', 'name email')
      .populate('order', 'orderStatus grandTotal orderDate shippingAddress itemsTotal deliveryFee couponCode couponDiscount items')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: replacements,
      total: replacements.length,
    });
  } catch (error) {
    console.error('Get all replacements error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get replacement by ID
// @route   GET /api/replacements/:id
// @access  Private
export const getReplacementById = async (req, res) => {
  try {
    const replacement = await Replacement.findById(req.params.id)
      .populate('user', 'name email')
      .populate('order', 'orderStatus grandTotal orderDate shippingAddress items itemsTotal deliveryFee couponCode couponDiscount');

    if (!replacement) {
      return res.status(404).json({
        success: false,
        message: 'Replacement request not found',
      });
    }

    // Check authorization
    if (
      req.user.role !== 'admin' &&
      replacement.user._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    res.json({
      success: true,
      data: replacement,
    });
  } catch (error) {
    console.error('Get replacement by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update replacement status (Admin)
// @route   PUT /api/replacements/:id
// @access  Private/Admin
export const updateReplacement = async (req, res) => {
  try {
    const {
      status,
      adminNotes,
      pickup,
      refund,
    } = req.body;

    const replacement = await Replacement.findById(req.params.id);

    if (!replacement) {
      return res.status(404).json({
        success: false,
        message: 'Replacement request not found',
      });
    }

    // Update fields
    if (status) {
      replacement.status = status;
      replacement.timeline.push({
        status,
        message: `Status updated to ${status}`,
        updatedBy: 'admin',
      });
    }

    if (adminNotes !== undefined) {
      replacement.adminNotes = adminNotes;
    }

    if (pickup) {
      replacement.pickup = {
        ...replacement.pickup,
        ...pickup,
      };
      
      if (pickup.pickedUpAt) {
        replacement.timeline.push({
          status: 'Picked Up',
          message: 'Product picked up from customer',
          updatedBy: 'admin',
        });
      }
    }

    if (refund) {
      replacement.refund = {
        ...replacement.refund,
        ...refund,
      };

      if (refund.refundedAt) {
        replacement.status = 'Refunded';
        replacement.timeline.push({
          status: 'Refunded',
          message: `Refund of ₹${refund.amount} processed via ${refund.method}`,
          updatedBy: 'admin',
        });
      }
    }

    await replacement.save();

    // Update order item return status when replacement status changes
    if (status) {
      const order = await Order.findById(replacement.order);
      if (order) {
        const itemIndex = order.items.findIndex(
          (item) => item.product.toString() === replacement.item.product.toString()
        );
        
        if (itemIndex !== -1) {
          // Map replacement status to item return status
          const returnStatusMap = {
            'Requested': 'requested',
            'Approved': 'approved',
            'Rejected': 'none',
            'Pickup Scheduled': 'approved',
            'Picked Up': 'approved',
            'Replacement Shipped': 'approved',
            'Completed': 'returned',
            'Refund Initiated': 'approved',
            'Refunded': 'refunded',
          };
          
          order.items[itemIndex].returnStatus = returnStatusMap[status] || 'none';
          
          if (status === 'Completed' || status === 'Refunded') {
            order.items[itemIndex].returnedAt = new Date();
          }
          
          if (status === 'Refunded' && refund?.amount) {
            order.items[itemIndex].refundAmount = refund.amount;
            
            // Restore product stock when refunded (item is not going back to inventory for replacement)
            if (!replacement.stockRestored) {
              const product = await Product.findById(replacement.item.product);
              if (product) {
                if (replacement.item.size) {
                  const sizeIndex = product.sizes.findIndex(s => s.label === replacement.item.size);
                  if (sizeIndex !== -1) {
                    product.sizes[sizeIndex].stock += replacement.item.quantity;
                  }
                } else {
                  product.stock += replacement.item.quantity;
                }
                await product.save();
                replacement.stockRestored = true;
                await replacement.save();
              }
            }
            
            // Check if all items in the order are refunded - if so, include delivery fee
            const allItemsRefunded = order.items.every(item => 
              item.returnStatus === 'refunded' || item.returnStatus === 'returned'
            );
            
            if (allItemsRefunded && order.deliveryFee > 0) {
              // Store that delivery fee should be refunded for this order
              order.deliveryFeeRefunded = true;
            }
          }
          
          await order.save();
        }
      }
    }

    // Send notification to user
    const statusMessages = {
      Approved: 'Your replacement request has been approved.',
      Rejected: 'Your replacement request has been rejected.',
      'Pickup Scheduled': `Pickup scheduled for ${new Date(pickup?.scheduledDate).toLocaleDateString()}`,
      'Picked Up': 'Your product has been picked up.',
      'Replacement Shipped': 'Your replacement item has been shipped.',
      Completed: 'Your replacement request has been completed.',
      'Refund Initiated': 'Refund has been initiated for your item.',
      Refunded: `Refund of ₹${refund?.amount || replacement.refund.amount} has been processed.`,
    };

    if (status && statusMessages[status]) {
      await User.findByIdAndUpdate(replacement.user, {
        $push: {
          notifications: {
            title: `Replacement ${status}`,
            message: statusMessages[status],
            type: 'order',
          },
        },
      });
    }

    res.json({
      success: true,
      message: 'Replacement updated successfully',
      data: replacement,
    });
  } catch (error) {
    console.error('Update replacement error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get replacement stats (Admin)
// @route   GET /api/replacements/admin/stats
// @access  Private/Admin
export const getReplacementStats = async (req, res) => {
  try {
    const totalRequests = await Replacement.countDocuments();
    const pending = await Replacement.countDocuments({ status: 'Requested' });
    const approved = await Replacement.countDocuments({ status: 'Approved' });
    const inProgress = await Replacement.countDocuments({
      status: { $in: ['Pickup Scheduled', 'Picked Up', 'Replacement Shipped'] },
    });
    const completed = await Replacement.countDocuments({ status: 'Completed' });
    const refunded = await Replacement.countDocuments({ status: 'Refunded' });
    const rejected = await Replacement.countDocuments({ status: 'Rejected' });

    // Calculate total refund amount
    const refundAggregation = await Replacement.aggregate([
      { $match: { status: 'Refunded' } },
      { $group: { _id: null, total: { $sum: '$refund.amount' } } },
    ]);
    const totalRefundAmount = refundAggregation[0]?.total || 0;

    res.json({
      success: true,
      data: {
        totalRequests,
        pending,
        approved,
        inProgress,
        completed,
        refunded,
        rejected,
        totalRefundAmount,
      },
    });
  } catch (error) {
    console.error('Get replacement stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
