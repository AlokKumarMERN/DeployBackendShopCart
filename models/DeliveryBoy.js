import mongoose from 'mongoose';

const deliveryBoySchema = new mongoose.Schema(
  {
    deliveryBoyId: {
      type: String,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    vehicleType: {
      type: String,
      enum: ['Bike', 'Scooter', 'Bicycle', 'Car', 'Van'],
      required: true,
    },
    vehicleNumber: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    assignedOrders: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    }],
    totalDeliveries: {
      type: Number,
      default: 0,
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Generate unique delivery boy ID before saving
deliveryBoySchema.pre('save', async function (next) {
  if (!this.deliveryBoyId) {
    const count = await mongoose.model('DeliveryBoy').countDocuments();
    this.deliveryBoyId = `DB${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

const DeliveryBoy = mongoose.model('DeliveryBoy', deliveryBoySchema);

export default DeliveryBoy;
