import Feedback from '../models/Feedback.js';

// @desc    Submit contact feedback
// @route   POST /api/contact/feedback
// @access  Public
export const submitFeedback = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and message',
      });
    }

    const feedback = await Feedback.create({
      name,
      email,
      message,
    });

    res.status(201).json({
      success: true,
      data: feedback,
      message: 'Thank you for your feedback! We will get back to you soon.',
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting feedback',
      error: error.message,
    });
  }
};

// @desc    Get all feedback (admin only)
// @route   GET /api/contact/feedback
// @access  Private/Admin
export const getAllFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get feedback count
// @route   GET /api/contact/feedback/count
// @access  Public (for testing)
export const getFeedbackCount = async (req, res) => {
  try {
    const total = await Feedback.countDocuments();
    const byStatus = await Feedback.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      total,
      byStatus: byStatus.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Get feedback count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
