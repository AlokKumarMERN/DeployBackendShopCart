import mongoose from 'mongoose';

const replacementSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    item: {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      name: String,
      image: String,
      price: Number,
      quantity: Number,
      size: String,
    },
    reason: {
      type: String,
      required: [true, 'Replacement reason is required'],
      enum: [
        'Damaged Product',
        'Wrong Product',
        'Quality Issue',
        'Size Issue',
        'Missing Parts',
        'Not as Described',
        'Other',
      ],
    },
    description: {
      type: String,
      required: [true, 'Please provide a detailed description'],
    },
    images: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: [
        'Requested',
        'Approved',
        'Rejected',
        'Pickup Scheduled',
        'Picked Up',
        'Replacement Shipped',
        'Completed',
        'Refund Initiated',
        'Refunded',
      ],
      default: 'Requested',
    },
    adminNotes: {
      type: String,
      default: '',
    },
    pickup: {
      scheduledDate: Date,
      agentName: String,
      agentPhone: String,
      pickedUpAt: Date,
      address: {
        fullName: String,
        phone: String,
        addressLine1: String,
        addressLine2: String,
        city: String,
        state: String,
        zipCode: String,
      },
    },
    refund: {
      amount: {
        type: Number,
        default: 0,
      },
      method: {
        type: String,
        enum: ['Original Payment Method', 'Bank Transfer', 'Store Credit', 'UPI'],
      },
      transactionId: String,
      refundedAt: Date,
      notes: String,
    },
    replacementOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    timeline: [
      {
        status: String,
        message: String,
        updatedBy: {
          type: String,
          enum: ['user', 'admin', 'system'],
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    deliveryDate: {
      type: Date,
      required: true,
    },
    replacementDeadline: {
      type: Date,
      required: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    stockRestored: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual fields for easier access in frontend
replacementSchema.virtual('productId').get(function () {
  return this.item?.product;
});

replacementSchema.virtual('productName').get(function () {
  return this.item?.name;
});

replacementSchema.virtual('productImage').get(function () {
  return this.item?.image;
});

replacementSchema.virtual('quantity').get(function () {
  return this.item?.quantity;
});

replacementSchema.virtual('price').get(function () {
  return this.item?.price;
});

// Index for efficient queries
replacementSchema.index({ user: 1, status: 1 });
replacementSchema.index({ order: 1 });
replacementSchema.index({ status: 1, createdAt: -1 });

const Replacement = mongoose.model('Replacement', replacementSchema);

export default Replacement;
