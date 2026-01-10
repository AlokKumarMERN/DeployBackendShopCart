import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { validationResult } from 'express-validator';
import { sendPasswordResetEmail, sendPasswordResetConfirmation } from '../utils/emailService.js';

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register new user
// @route   POST /api/auth/signup
// @access  Public
export const signup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { name, email, password, phone } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      phone: phone || null,
      passwordHash,
    });

    if (user) {
      res.status(201).json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isAdmin: user.role === 'admin',
          addresses: user.addresses || [],
          token: generateToken(user._id),
        },
        message: 'User registered successfully',
      });
    }
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during signup',
      error: error.message,
    });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isAdmin: user.role === 'admin',
        addresses: user.addresses || [],
        token: generateToken(user._id),
      },
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message,
    });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isAdmin: user.role === 'admin',
        addresses: user.addresses || [],
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update user addresses
// @route   PUT /api/auth/addresses
// @access  Private
export const updateAddresses = async (req, res) => {
  try {
    console.log('Update addresses request:', req.body);
    console.log('User ID:', req.user._id);
    
    const user = await User.findById(req.user._id);

    if (user) {
      console.log('User found, current addresses:', user.addresses);
      user.addresses = req.body.addresses || user.addresses;
      const updatedUser = await user.save();
      console.log('User saved, new addresses:', updatedUser.addresses);

      res.json({
        success: true,
        data: {
          _id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          isAdmin: updatedUser.role === 'admin',
          role: updatedUser.role,
          addresses: updatedUser.addresses,
        },
        message: 'Addresses updated successfully',
      });
    } else {
      console.log('User not found');
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
  } catch (error) {
    console.error('Update addresses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Google OAuth Success Callback
// @route   GET /api/auth/google/success
// @access  Public
export const googleAuthSuccess = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed',
      });
    }

    const token = generateToken(req.user._id);
    const userData = {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      avatar: req.user.avatar,
      role: req.user.role,
      isAdmin: req.user.role === 'admin',
      addresses: req.user.addresses || [],
      token,
    };

    // Redirect to frontend with user data
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendURL}/auth/google/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(userData))}`);
  } catch (error) {
    console.error('Google auth success error:', error);
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendURL}/login?error=authentication_failed`);
  }
};

// @desc    Request password reset
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link will be sent.',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token and set to resetPasswordToken field
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set token and expiry (1 hour)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    // Create reset URL
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendURL}/reset-password/${resetToken}`;

    // Send email asynchronously (don't wait for it to complete)
    // This makes the API response instant while email sends in background
    sendPasswordResetEmail(user.email, resetUrl)
      .then(() => {
        console.log('✅ Password reset email sent successfully to:', user.email);
      })
      .catch(async (error) => {
        console.error('❌ Failed to send password reset email:', error);
        // Clear the reset token if email fails
        try {
          user.resetPasswordToken = undefined;
          user.resetPasswordExpire = undefined;
          await user.save();
        } catch (saveError) {
          console.error('Failed to clear reset token:', saveError);
        }
      });

    // Respond immediately - don't wait for email
    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link will be sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password/:token
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // Hash the token from URL to compare with DB
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(password, salt);

    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    // Send confirmation email
    await sendPasswordResetConfirmation(user.email);

    res.json({
      success: true,
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Verify reset token
// @route   GET /api/auth/verify-reset-token/:token
// @access  Public
export const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    // Hash the token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }

    res.json({
      success: true,
      message: 'Token is valid',
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get user wishlist
// @route   GET /api/auth/wishlist
// @access  Private
export const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist');
    res.json({
      success: true,
      data: user.wishlist || [],
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Add product to wishlist
// @route   POST /api/auth/wishlist/:productId
// @access  Private
export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const user = await User.findById(req.user._id);

    // Initialize wishlist if it doesn't exist
    if (!user.wishlist) {
      user.wishlist = [];
    }

    if (!user.wishlist.includes(productId)) {
      user.wishlist.push(productId);
      await user.save();
    }

    res.json({
      success: true,
      message: 'Product added to wishlist',
      data: user.wishlist,
    });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Remove product from wishlist
// @route   DELETE /api/auth/wishlist/:productId
// @access  Private
export const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const user = await User.findById(req.user._id);

    // Initialize wishlist if it doesn't exist
    if (!user.wishlist) {
      user.wishlist = [];
    }

    user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
    await user.save();

    res.json({
      success: true,
      message: 'Product removed from wishlist',
      data: user.wishlist,
    });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Check if product is in wishlist
// @route   GET /api/auth/wishlist/check/:productId
// @access  Private
export const checkWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const user = await User.findById(req.user._id);
    
    // Handle undefined wishlist
    const isInWishlist = user.wishlist ? user.wishlist.some(id => id.toString() === productId) : false;

    res.json({
      success: true,
      data: { isInWishlist },
    });
  } catch (error) {
    console.error('Check wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get user notifications
// @route   GET /api/auth/notifications
// @access  Private
export const getNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const notifications = user.notifications.sort((a, b) => b.createdAt - a.createdAt);
    
    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get unread notification count
// @route   GET /api/auth/notifications/count
// @access  Private
export const getNotificationCount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notifications');
    const unreadCount = user.notifications?.filter(n => !n.isRead).length || 0;
    
    res.json({
      success: true,
      data: { unreadCount },
    });
  } catch (error) {
    console.error('Get notification count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/auth/notifications/:notificationId/read
// @access  Private
export const markNotificationRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const user = await User.findById(req.user._id);

    const notification = user.notifications.id(notificationId);
    if (notification) {
      notification.isRead = true;
      await user.save();
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/auth/notifications/read-all
// @access  Private
export const markAllNotificationsRead = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    user.notifications.forEach(notification => {
      notification.isRead = true;
    });
    await user.save();

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Delete notification
// @route   DELETE /api/auth/notifications/:notificationId
// @access  Private
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const user = await User.findById(req.user._id);

    user.notifications = user.notifications.filter(
      n => n._id.toString() !== notificationId
    );
    await user.save();

    res.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get user settings
// @route   GET /api/auth/settings
// @access  Private
export const getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.json({
      success: true,
      data: { ...user.settings, phone: user.phone || '' },
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update user settings
// @route   PUT /api/auth/settings
// @access  Private
export const updateSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Handle phone number separately (it's a user field, not settings)
    if (req.body.phone !== undefined) {
      user.phone = req.body.phone;
      delete req.body.phone;
    }
    
    user.settings = {
      ...user.settings,
      ...req.body,
    };
    await user.save();

    res.json({
      success: true,
      data: { ...user.settings, phone: user.phone },
      message: 'Settings updated successfully',
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
