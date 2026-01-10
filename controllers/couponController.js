import Coupon from '../models/Coupon.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import { sendBulkCouponNotifications } from '../utils/emailService.js';

// @desc    Get all coupons (Admin)
// @route   GET /api/coupons/admin
// @access  Private/Admin
export const getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: coupons,
    });
  } catch (error) {
    console.error('Get all coupons error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get single coupon by ID (Admin)
// @route   GET /api/coupons/admin/:id
// @access  Private/Admin
export const getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }
    
    res.json({
      success: true,
      data: coupon,
    });
  } catch (error) {
    console.error('Get coupon by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Create new coupon
// @route   POST /api/coupons
// @access  Private/Admin
export const createCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      usageLimit,
      usagePerUser,
      startDate,
      endDate,
      isActive,
      targeting,
      notifyUsers,
      sendEmail,
    } = req.body;
    
    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code already exists',
      });
    }

    // Find eligible users if targeting is enabled
    let eligibleUserIds = [];
    let eligibleUsersData = []; // Full user data for email/SMS
    if (targeting && targeting.enabled) {
      const users = await User.find({ role: 'user' }).select('_id name email phone createdAt wishlist addresses settings');
      
      for (const user of users) {
        const orders = await Order.find({ user: user._id, orderStatus: { $ne: 'Cancelled' } });
        const totalSpent = orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
        const orderCount = orders.length;
        const accountAgeDays = Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));
        const wishlistCount = user.wishlist?.length || 0;

        let matches = true;

        // User type check
        if (targeting.userType === 'new' && orderCount > 0) matches = false;
        if (targeting.userType === 'existing' && orderCount === 0) matches = false;

        // Purchase amount check
        if (targeting.minTotalPurchase && totalSpent < targeting.minTotalPurchase) matches = false;
        if (targeting.maxTotalPurchase && totalSpent > targeting.maxTotalPurchase) matches = false;

        // Order count check
        if (targeting.minOrderCount && orderCount < targeting.minOrderCount) matches = false;
        if (targeting.maxOrderCount && orderCount > targeting.maxOrderCount) matches = false;

        // Registration age check
        if (targeting.registeredDaysAgo && accountAgeDays < targeting.registeredDaysAgo) matches = false;

        // Wishlist check
        if (targeting.hasWishlistItems === true && wishlistCount === 0) matches = false;
        if (targeting.hasWishlistItems === false && wishlistCount > 0) matches = false;

        if (matches) {
          eligibleUserIds.push(user._id);
          eligibleUsersData.push(user);
        }
      }
    }
    
    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue,
      minOrderAmount: minOrderAmount || 0,
      maxDiscountAmount: maxDiscountAmount || null,
      usageLimit: usageLimit || null,
      usagePerUser: usagePerUser || 1,
      startDate: startDate || new Date(),
      endDate,
      isActive: isActive !== undefined ? isActive : true,
      targeting: targeting || { enabled: false },
      eligibleUsers: eligibleUserIds,
      notifyUsers: notifyUsers || false,
    });

    // Prepare coupon data for notifications
    const couponData = {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderAmount: coupon.minOrderAmount,
      endDate: coupon.endDate,
      description: coupon.description,
    };

    // Track notification results
    let notificationResults = null;

    // Send in-app notifications to eligible users if enabled
    if (notifyUsers && eligibleUserIds.length > 0) {
      const notification = {
        type: 'coupon',
        title: '🎉 New Coupon Available!',
        message: `Use code ${coupon.code} to get ${coupon.discountType === 'percentage' ? coupon.discountValue + '%' : '₹' + coupon.discountValue} off on your next order! Valid till ${new Date(coupon.endDate).toLocaleDateString('en-IN')}.`,
        data: couponData,
        isRead: false,
        createdAt: new Date(),
      };

      await User.updateMany(
        { _id: { $in: eligibleUserIds } },
        { $push: { notifications: { $each: [notification], $position: 0 } } }
      );
    }

    // Send Email notifications (async - don't wait)
    if (sendEmail && eligibleUsersData.length > 0) {
      // Send notifications in background (don't block response)
      sendBulkCouponNotifications(eligibleUsersData, couponData, {
        sendEmail: true,
      }).then((results) => {
        console.log('📧 Bulk notification results:', results);
      }).catch((error) => {
        console.error('❌ Bulk notification error:', error);
      });

      notificationResults = {
        sendingEmail: true,
        targetedUsers: eligibleUsersData.length,
      };
    }
    
    res.status(201).json({
      success: true,
      message: `Coupon created successfully${eligibleUserIds.length > 0 ? `. ${eligibleUserIds.length} users are eligible.` : ''}${sendEmail ? ' Emails are being sent.' : ''}`,
      data: coupon,
      eligibleCount: eligibleUserIds.length,
      notifications: notificationResults,
    });
  } catch (error) {
    console.error('Create coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update coupon
// @route   PUT /api/coupons/:id
// @access  Private/Admin
export const updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }
    
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      usageLimit,
      usagePerUser,
      startDate,
      endDate,
      isActive,
    } = req.body;
    
    // Check if new code already exists (if code is being changed)
    if (code && code.toUpperCase() !== coupon.code) {
      const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
      if (existingCoupon) {
        return res.status(400).json({
          success: false,
          message: 'Coupon code already exists',
        });
      }
    }
    
    // Update fields
    if (code) coupon.code = code.toUpperCase();
    if (description !== undefined) coupon.description = description;
    if (discountType) coupon.discountType = discountType;
    if (discountValue !== undefined) coupon.discountValue = discountValue;
    if (minOrderAmount !== undefined) coupon.minOrderAmount = minOrderAmount;
    if (maxDiscountAmount !== undefined) coupon.maxDiscountAmount = maxDiscountAmount;
    if (usageLimit !== undefined) coupon.usageLimit = usageLimit;
    if (usagePerUser !== undefined) coupon.usagePerUser = usagePerUser;
    if (startDate) coupon.startDate = startDate;
    if (endDate) coupon.endDate = endDate;
    if (isActive !== undefined) coupon.isActive = isActive;
    
    await coupon.save();
    
    res.json({
      success: true,
      message: 'Coupon updated successfully',
      data: coupon,
    });
  } catch (error) {
    console.error('Update coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Delete coupon
// @route   DELETE /api/coupons/:id
// @access  Private/Admin
export const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }
    
    await Coupon.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Coupon deleted successfully',
    });
  } catch (error) {
    console.error('Delete coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Validate and apply coupon
// @route   POST /api/coupons/apply
// @access  Private
export const applyCoupon = async (req, res) => {
  try {
    const { code, orderAmount } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code is required',
      });
    }
    
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Invalid coupon code',
      });
    }

    // Check if coupon has targeting enabled and user is eligible
    if (coupon.targeting && coupon.targeting.enabled) {
      const isEligible = coupon.eligibleUsers.some(
        userId => userId.toString() === req.user._id.toString()
      );
      
      if (!isEligible) {
        return res.status(400).json({
          success: false,
          message: 'You are not eligible for this coupon',
        });
      }
    }
    
    // Validate coupon
    const validation = coupon.isValid(orderAmount, req.user._id);
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }
    
    // Calculate discount
    const discount = coupon.calculateDiscount(orderAmount);
    
    res.json({
      success: true,
      message: 'Coupon applied successfully',
      data: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discount,
        finalAmount: orderAmount - discount,
      },
    });
  } catch (error) {
    console.error('Apply coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get coupon stats
// @route   GET /api/coupons/stats
// @access  Private/Admin
export const getCouponStats = async (req, res) => {
  try {
    const totalCoupons = await Coupon.countDocuments();
    const activeCoupons = await Coupon.countDocuments({ isActive: true });
    const expiredCoupons = await Coupon.countDocuments({ endDate: { $lt: new Date() } });
    
    res.json({
      success: true,
      data: {
        totalCoupons,
        activeCoupons,
        expiredCoupons,
      },
    });
  } catch (error) {
    console.error('Get coupon stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
