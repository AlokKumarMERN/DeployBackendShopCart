import mongoose from 'mongoose';
import Product from '../models/Product.js';
import { processImageUrls } from '../utils/imageHelper.js';

// @desc    Get all products with optional filters
// @route   GET /api/products
// @access  Public
export const getProducts = async (req, res) => {
  try {
    const { category, featured, page = 1, limit = 20 } = req.query;

    // Build query
    let query = {};
    if (category) {
      query.category = category;
    }
    if (featured === 'true') {
      query.featured = true;
    }

    // Pagination
    const skip = (page - 1) * limit;

    const products = await Product.find(query)
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: products,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Search products by name
// @route   GET /api/products/search
// @access  Public
export const searchProducts = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === '') {
      return res.json({
        success: true,
        data: [],
      });
    }

    // Search by name (case-insensitive)
    const products = await Product.find({
      name: { $regex: q, $options: 'i' },
    })
      .limit(10)
      .select('name images price discountPercent category');

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get products by category
// @route   GET /api/products/category/:category
// @access  Public
export const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 10 } = req.query;

    const products = await Product.find({ category })
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments({ category });

    res.json({
      success: true,
      data: products,
      total,
      hasMore: total > parseInt(limit),
    });
  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Add review to product
// @route   POST /api/products/:id/reviews
// @access  Private
export const addProductReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check if user has a delivered order for this product
    const Order = mongoose.model('Order');
    const deliveredOrder = await Order.findOne({
      user: req.user._id,
      orderStatus: 'Delivered',
      'items.product': req.params.id,
    });

    if (!deliveredOrder) {
      return res.status(403).json({
        success: false,
        message: 'You can only review products that you have received',
      });
    }

    // Check if user already reviewed
    const alreadyReviewed = product.reviews.find(
      (review) => review.user && review.user.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product',
      });
    }

    const review = {
      user: req.user._id,
      userName: req.user.name,
      rating: Number(rating),
      comment,
    };

    product.reviews.push(review);
    product.updateRating();

    await product.save();
    
    console.log('✅ Review added successfully. Total reviews:', product.reviews.length);
    console.log('Updated average rating:', product.averageRating);

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      data: {
        averageRating: product.averageRating,
        totalReviews: product.totalReviews,
      }
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private (Admin only)
export const createProduct = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create products',
      });
    }

    // Convert Google Drive URLs if present
    if (req.body.images && req.body.images.length > 0) {
      req.body.images = processImageUrls(req.body.images);
    }

    const product = await Product.create(req.body);

    res.status(201).json({
      success: true,
      data: product,
      message: 'Product created successfully',
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (Admin only)
export const updateProduct = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update products',
      });
    }

    // Convert Google Drive URLs if present
    if (req.body.images && req.body.images.length > 0) {
      req.body.images = processImageUrls(req.body.images);
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.json({
      success: true,
      data: product,
      message: 'Product updated successfully',
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private (Admin only)
export const deleteProduct = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete products',
      });
    }

    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get product statistics (for admin dashboard)
// @route   GET /api/products/stats
// @access  Private (Admin only)
export const getProductStats = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view stats',
      });
    }

    // Use countDocuments for much faster queries
    const [totalProducts, featuredProducts] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ featured: true }),
    ]);

    res.json({
      success: true,
      data: {
        totalProducts,
        featuredProducts,
      },
    });
  } catch (error) {
    console.error('Get product stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
