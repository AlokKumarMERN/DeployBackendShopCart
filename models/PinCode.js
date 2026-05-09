import mongoose from 'mongoose';

const pinCodeSchema = new mongoose.Schema(
  {
    pinCode: {
      type: String,
      required: true,
      unique: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    exactDeliveryAvailable: {
      type: Boolean,
      default: true,
    },
    estimatedDeliveryDays: {
      type: Number,
      default: 3,
    },
    exactDeliveryCharges: {
      type: Number,
      default: 0,
    },
    normalDeliveryCharges: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

pinCodeSchema.index({ pinCode: 1, isActive: 1 });

const PinCode = mongoose.model('PinCode', pinCodeSchema);

export default PinCode;
