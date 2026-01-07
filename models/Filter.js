import mongoose from 'mongoose';

const filterOptionSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
  },
  value: {
    type: String,
    required: true,
  },
});

const filterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Filter name is required'],
      trim: true,
    },
    key: {
      type: String,
      required: [true, 'Filter key is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['radio', 'checkbox', 'range'],
      default: 'radio',
    },
    options: [filterOptionSchema],
    // Which product field this filter applies to
    productField: {
      type: String,
      required: true,
      default: 'tags', // Default to filtering by product tags
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
filterSchema.index({ isActive: 1, order: 1 });

const Filter = mongoose.model('Filter', filterSchema);

export default Filter;
