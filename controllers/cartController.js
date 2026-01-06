import User from '../models/User.js';
import jwt from 'jsonwebtoken';

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
export const getCart = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user.cart || [],
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cart',
      error: error.message,
    });
  }
};

// @desc    Update user's cart
// @route   PUT /api/cart
// @access  Private
export const updateCart = async (req, res) => {
  try {
    const { cart } = req.body;

    if (!Array.isArray(cart)) {
      return res.status(400).json({
        success: false,
        message: 'Cart must be an array',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { cart },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user.cart,
      message: 'Cart updated successfully',
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cart',
      error: error.message,
    });
  }
};

// @desc    Clear user's cart
// @route   DELETE /api/cart
// @access  Private
export const clearCart = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { cart: [] },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'Cart cleared successfully',
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart',
      error: error.message,
    });
  }
};

// @desc    Sync cart (for sendBeacon on page unload)
// @route   POST /api/cart/sync
// @access  Private (token in body for sendBeacon support)
export const syncCart = async (req, res) => {
  try {
    const { items, token } = req.body;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Items must be an array',
      });
    }

    // Verify token manually since sendBeacon can't set headers
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findByIdAndUpdate(
      decoded.id,
      { cart: items },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'Cart synced successfully',
    });
  } catch (error) {
    console.error('Sync cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync cart',
      error: error.message,
    });
  }
};
