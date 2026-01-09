import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
export const createOrder = async (req, res) => {
  try {
    const {
      items,
      shippingAddress,
      itemsTotal,
      deliveryFee,
      otherCharges,
      couponCode,
      couponDiscount,
      grandTotal,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No order items provided',
      });
    }

    // Validate products exist and have stock
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.name}`,
        });
      }

      // Check stock
      if (item.size) {
        const sizeOption = product.sizes.find((s) => s.label === item.size);
        if (!sizeOption || sizeOption.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.name} - ${item.size}`,
          });
        }
      } else {
        if (product.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.name}`,
          });
        }
      }
    }

    const order = await Order.create({
      user: req.user._id,
      items,
      shippingAddress,
      itemsTotal,
      deliveryFee: deliveryFee || 0,
      otherCharges: otherCharges || 0,
      couponCode: couponCode || null,
      couponDiscount: couponDiscount || 0,
      grandTotal,
      paymentMethod: 'COD',
    });

    // If coupon was used, increment usage count
    if (couponCode) {
      await Coupon.findOneAndUpdate(
        { code: couponCode.toUpperCase() },
        { 
          $inc: { usedCount: 1 },
          $push: { usedBy: { user: req.user._id, usedAt: new Date() } }
        }
      );
    }

    // Reduce stock
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (item.size) {
        const sizeIndex = product.sizes.findIndex((s) => s.label === item.size);
        if (sizeIndex !== -1) {
          product.sizes[sizeIndex].stock -= item.quantity;
        }
      } else {
        product.stock -= item.quantity;
      }
      await product.save();
    }

    res.status(201).json({
      success: true,
      data: order,
      message: 'Order placed successfully',
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating order',
      error: error.message,
    });
  }
};

// @desc    Get user orders
// @route   GET /api/orders
// @access  Private
export const getUserOrders = async (req, res) => {
  try {
    let query = {};
    
    // Check if admin wants all orders (for AdminOrders page) or just their own (for Profile page)
    // Use ?all=true query param for admin to get all orders
    const wantsAllOrders = req.query.all === 'true' && req.user.role === 'admin';
    
    // If not admin OR admin viewing their own orders in profile, filter by user
    if (!wantsAllOrders) {
      query.user = req.user._id;
    }
    
    const orders = await Order.find(query)
      .populate('items.product', 'name images')
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      'items.product',
      'name images'
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Make sure order belongs to user or user is admin
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order',
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Get order by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (Admin only)
export const updateOrderStatus = async (req, res) => {
  try {
    const { status, deliveryAgent, estimatedDeliveryDate } = req.body;
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update order status',
      });
    }

    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    order.orderStatus = status;
    
    // Update delivery agent if provided
    if (deliveryAgent) {
      order.deliveryAgent = deliveryAgent;
    }
    
    // Update estimated delivery date if provided
    if (estimatedDeliveryDate) {
      order.estimatedDeliveryDate = estimatedDeliveryDate;
    }
    
    // Set delivery date if status is Delivered
    if (status === 'Delivered' && !order.deliveryDate) {
      order.deliveryDate = new Date();
    }
    
    await order.save();

    res.json({
      success: true,
      data: order,
      message: 'Order updated successfully',
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
export const cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason is required',
      });
    }

    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check if user owns this order or is admin
    const isAdmin = req.user.role === 'admin';
    const isOwner = order.user.toString() === req.user._id.toString();
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this order',
      });
    }

    // Check if order can be cancelled
    if (order.orderStatus === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Order is already cancelled',
      });
    }

    if (order.orderStatus === 'Delivered') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel delivered order',
      });
    }

    // Restore stock
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        if (item.size) {
          const sizeIndex = product.sizes.findIndex((s) => s.label === item.size);
          if (sizeIndex !== -1) {
            product.sizes[sizeIndex].stock += item.quantity;
          }
        } else {
          product.stock += item.quantity;
        }
        await product.save();
      }
    }

    // Update order
    order.orderStatus = 'Cancelled';
    order.cancellation = {
      reason: reason,
      cancelledAt: new Date(),
      cancelledBy: isAdmin ? 'admin' : 'user',
    };
    
    await order.save();

    res.json({
      success: true,
      data: order,
      message: 'Order cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get order statistics (for admin dashboard)
// @route   GET /api/orders/stats
// @access  Private (Admin only)
export const getOrderStats = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view stats',
      });
    }

    // Use countDocuments for much faster queries
    const [totalOrders, pendingOrders, deliveredOrders] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ orderStatus: 'Pending' }),
      Order.countDocuments({ orderStatus: 'Delivered' }),
    ]);

    res.json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        deliveredOrders,
      },
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get invoice data for an order
// @route   GET /api/orders/:id/invoice
// @access  Private
export const getOrderInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('items.product', 'name category');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Make sure order belongs to user or user is admin
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this invoice',
      });
    }

    // Import Replacement model to get refund data
    const Replacement = (await import('../models/Replacement.js')).default;
    
    // Get replacements for this order to check for refunds
    const replacements = await Replacement.find({ 
      order: order._id,
      status: { $in: ['Refunded', 'Completed', 'Refund Initiated'] }
    });

    // Calculate refund details
    let totalRefundedAmount = 0;
    let refundedItems = [];
    let deliveryFeeRefunded = order.deliveryFeeRefunded || false;

    replacements.forEach(rep => {
      if (rep.status === 'Refunded' && rep.refund?.amount) {
        totalRefundedAmount += rep.refund.amount;
        refundedItems.push({
          name: rep.item.name,
          quantity: rep.item.quantity,
          price: rep.item.price,
          refundAmount: rep.refund.amount,
          refundMethod: rep.refund.method,
          refundedAt: rep.refund.refundedAt,
          reason: rep.reason,
        });
      }
    });

    // If all items refunded and delivery fee was charged, add it to refund
    if (deliveryFeeRefunded && order.deliveryFee > 0) {
      totalRefundedAmount += order.deliveryFee;
    }

    // Generate invoice data
    const invoiceData = {
      invoiceNumber: `INV-${order._id.toString().slice(-8).toUpperCase()}`,
      orderNumber: order._id.toString().slice(-8).toUpperCase(),
      orderDate: order.orderDate || order.createdAt,
      deliveryDate: order.deliveryDate,
      customer: {
        name: order.user.name,
        email: order.user.email,
      },
      shippingAddress: order.shippingAddress,
      items: order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        subtotal: item.subtotal || (item.price * item.quantity),
        category: item.category || item.product?.category || 'N/A',
        returnStatus: item.returnStatus || 'none',
        refundAmount: item.refundAmount || 0,
      })),
      itemsTotal: order.itemsTotal,
      deliveryFee: order.deliveryFee || 0,
      deliveryFeeRefunded: deliveryFeeRefunded,
      otherCharges: order.otherCharges || 0,
      couponCode: order.couponCode,
      couponDiscount: order.couponDiscount || 0,
      grandTotal: order.grandTotal,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      cancellation: order.cancellation || null,
      // Refund information
      hasRefunds: refundedItems.length > 0,
      refundedItems: refundedItems,
      totalRefundedAmount: totalRefundedAmount,
      netPayable: order.grandTotal - totalRefundedAmount,
    };

    res.json({
      success: true,
      data: invoiceData,
    });
  } catch (error) {
    console.error('Get order invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
