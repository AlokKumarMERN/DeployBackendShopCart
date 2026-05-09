import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        name: String,
        image: String,
        price: Number,
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        size: String, // Selected size if applicable
        subtotal: Number,
        category: String, // Store category for analytics
        returnStatus: {
          type: String,
          enum: ['none', 'requested', 'approved', 'returned', 'refunded'],
          default: 'none',
        },
        returnedAt: Date,
        refundAmount: Number,
      },
    ],
    deliveryType: {
      type: String,
      enum: ['normal', 'exact'],
      default: 'normal',
    },
    shippingAddress: {
      fullName: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
      addressLine1: {
        type: String,
        required: true,
      },
      addressLine2: String,
      houseNo: String, // For exact delivery
      colony: String, // For exact delivery
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      zipCode: {
        type: String,
        required: true,
      },
      latitude: Number,
      longitude: Number,
    },
    itemsTotal: {
      type: Number,
      required: true,
    },
    deliveryFee: {
      type: Number,
      default: 0,
    },
    otherCharges: {
      type: Number,
      default: 0,
    },
    couponCode: {
      type: String,
      default: null,
    },
    couponDiscount: {
      type: Number,
      default: 0,
    },
    deliveryFeeRefunded: {
      type: Boolean,
      default: false,
    },
    grandTotal: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['COD'],
      default: 'COD',
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed'],
      default: 'Pending',
    },
    orderStatus: {
      type: String,
      enum: ['Pending', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'],
      default: 'Pending',
    },
    cancellation: {
      reason: String,
      cancelledAt: Date,
      cancelledBy: {
        type: String,
        enum: ['user', 'admin'],
      },
    },
    deliveryAgent: {
      name: String,
      phone: String,
    },
    deliveryBoy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryBoy',
    },
    estimatedDeliveryDate: Date,
    orderDate: {
      type: Date,
      default: Date.now,
    },
    deliveryDate: Date,
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model('Order', orderSchema);

export default Order;
