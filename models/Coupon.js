import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
      default: 'percentage',
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: 0,
    },
    minOrderAmount: {
      type: Number,
      default: 0,
    },
    maxDiscountAmount: {
      type: Number,
      default: null,
    },
    usageLimit: {
      type: Number,
      default: null,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    usagePerUser: {
      type: Number,
      default: 1,
    },
    usedBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      usedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Targeting criteria for coupon
    targeting: {
      enabled: {
        type: Boolean,
        default: false,
      },
      userType: {
        type: String,
        enum: ['all', 'new', 'existing'],
        default: 'all',
      },
      minTotalPurchase: {
        type: Number,
        default: 0,
      },
      maxTotalPurchase: {
        type: Number,
        default: null,
      },
      minOrderCount: {
        type: Number,
        default: 0,
      },
      maxOrderCount: {
        type: Number,
        default: null,
      },
      registeredDaysAgo: {
        type: Number,
        default: null,
      },
      hasWishlistItems: {
        type: Boolean,
        default: null,
      },
    },
    // Users who are eligible and notified
    eligibleUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    notifyUsers: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Method to check if coupon is valid
couponSchema.methods.isValid = function(orderAmount, userId) {
  const now = new Date();
  
  // Check if coupon is active
  if (!this.isActive) {
    return { valid: false, message: 'This coupon is not active' };
  }
  
  // Check date validity
  if (now < this.startDate) {
    return { valid: false, message: 'This coupon is not yet active' };
  }
  
  if (now > this.endDate) {
    return { valid: false, message: 'This coupon has expired' };
  }
  
  // Check usage limit
  if (this.usageLimit !== null && this.usedCount >= this.usageLimit) {
    return { valid: false, message: 'This coupon has reached its usage limit' };
  }
  
  // Check minimum order amount
  if (orderAmount < this.minOrderAmount) {
    return { valid: false, message: `Minimum order amount is ₹${this.minOrderAmount}` };
  }
  
  // Check per-user usage limit
  if (userId && this.usagePerUser) {
    const userUsageCount = this.usedBy.filter(
      (usage) => usage.user.toString() === userId.toString()
    ).length;
    
    if (userUsageCount >= this.usagePerUser) {
      return { valid: false, message: 'You have already used this coupon' };
    }
  }
  
  return { valid: true };
};

// Method to calculate discount
couponSchema.methods.calculateDiscount = function(orderAmount) {
  let discount = 0;
  
  if (this.discountType === 'percentage') {
    discount = (orderAmount * this.discountValue) / 100;
  } else {
    discount = this.discountValue;
  }
  
  // Apply max discount limit if set
  if (this.maxDiscountAmount !== null && discount > this.maxDiscountAmount) {
    discount = this.maxDiscountAmount;
  }
  
  // Discount cannot exceed order amount
  if (discount > orderAmount) {
    discount = orderAmount;
  }
  
  return Math.round(discount);
};

const Coupon = mongoose.model('Coupon', couponSchema);

export default Coupon;
