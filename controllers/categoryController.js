import Category from '../models/Category.js';

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Create a new category
// @route   POST /api/categories
// @access  Admin only
export const createCategory = async (req, res) => {
  try {
    console.log('Create category request received');
    console.log('Request body:', req.body);
    console.log('User:', req.user);

    const { name } = req.body;

    if (!name || !name.trim()) {
      console.log('Category name validation failed');
      return res.status(400).json({
        success: false,
        message: 'Category name is required',
      });
    }

    // Check if user exists and is admin
    if (!req.user) {
      console.log('User not found in request');
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (req.user.role !== 'admin') {
      console.log('User is not admin:', req.user.role);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create categories',
      });
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
    });

    if (existingCategory) {
      console.log('Category already exists:', name);
      return res.status(400).json({
        success: false,
        message: 'Category already exists',
      });
    }

    const category = await Category.create({
      name: name.trim(),
      createdBy: req.user.id,
    });

    console.log('Category created successfully:', category);
    res.status(201).json({
      success: true,
      data: category,
      message: 'Category created successfully',
    });
  } catch (error) {
    console.error('Create category error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Admin only
export const deleteCategory = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete categories',
      });
    }

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Import Product model to delete associated products
    const Product = (await import('../models/Product.js')).default;

    // Delete all products in this category
    const deleteResult = await Product.deleteMany({ category: category.name });
    console.log(`Deleted ${deleteResult.deletedCount} products in category: ${category.name}`);

    // Delete the category
    await category.deleteOne();

    res.json({
      success: true,
      message: `Category deleted successfully. ${deleteResult.deletedCount} products were also removed.`,
      deletedProducts: deleteResult.deletedCount,
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
