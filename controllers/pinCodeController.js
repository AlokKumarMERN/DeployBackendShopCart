import PinCode from '../models/PinCode.js';

// @desc    Get all pin codes
// @route   GET /api/pincodes
// @access  Public
export const getAllPinCodes = async (req, res) => {
  try {
    const pinCodes = await PinCode.find().sort({ pinCode: 1 });
    
    res.status(200).json({
      success: true,
      data: pinCodes,
    });
  } catch (error) {
    console.error('Error fetching pin codes:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Check if pin code supports exact delivery
// @route   GET /api/pincodes/check/:pincode
// @access  Public
export const checkPinCode = async (req, res) => {
  try {
    const normalizedPinCode = String(req.params.pincode || '').trim().replace(/\D/g, '');

    if (!/^\d{6}$/.test(normalizedPinCode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pin code format',
      });
    }

    // This endpoint is read-heavy during checkout, so short public caching helps reduce repeat hits.
    res.set('Cache-Control', 'public, max-age=300');

    const pinCode = await PinCode.findOne({
      pinCode: normalizedPinCode,
      isActive: true,
    })
      .select('city state exactDeliveryAvailable estimatedDeliveryDays exactDeliveryCharges normalDeliveryCharges')
      .lean();
    
    if (!pinCode) {
      return res.status(200).json({
        success: true,
        data: {
          pinCode: normalizedPinCode,
          available: false,
          exactDeliveryAvailable: false,
        },
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        pinCode: normalizedPinCode,
        available: true,
        exactDeliveryAvailable: pinCode.exactDeliveryAvailable,
        city: pinCode.city,
        state: pinCode.state,
        estimatedDeliveryDays: pinCode.estimatedDeliveryDays,
        exactDeliveryCharges: pinCode.exactDeliveryCharges,
        normalDeliveryCharges: pinCode.normalDeliveryCharges,
      },
    });
  } catch (error) {
    console.error('Error checking pin code:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Create pin code
// @route   POST /api/pincodes
// @access  Private/Admin
export const createPinCode = async (req, res) => {
  try {
    const {
      pinCode,
      city,
      state,
      exactDeliveryAvailable,
      estimatedDeliveryDays,
      exactDeliveryCharges,
      normalDeliveryCharges,
    } = req.body;

    // Check if pin code already exists
    const existingPinCode = await PinCode.findOne({ pinCode });

    if (existingPinCode) {
      return res.status(400).json({
        success: false,
        message: 'Pin code already exists',
      });
    }

    const newPinCode = await PinCode.create({
      pinCode,
      city,
      state,
      exactDeliveryAvailable: exactDeliveryAvailable || true,
      estimatedDeliveryDays: estimatedDeliveryDays || 3,
      exactDeliveryCharges: exactDeliveryCharges || 0,
      normalDeliveryCharges: normalDeliveryCharges || 0,
    });
    
    res.status(201).json({
      success: true,
      data: newPinCode,
      message: 'Pin code added successfully',
    });
  } catch (error) {
    console.error('Error creating pin code:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Update pin code
// @route   PUT /api/pincodes/:id
// @access  Private/Admin
export const updatePinCode = async (req, res) => {
  try {
    const pinCodeData = await PinCode.findById(req.params.id);
    
    if (!pinCodeData) {
      return res.status(404).json({
        success: false,
        message: 'Pin code not found',
      });
    }

    const allowedUpdates = [
      'city',
      'state',
      'isActive',
      'exactDeliveryAvailable',
      'estimatedDeliveryDays',
      'exactDeliveryCharges',
      'normalDeliveryCharges',
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        pinCodeData[field] = req.body[field];
      }
    });

    await pinCodeData.save();
    
    res.status(200).json({
      success: true,
      data: pinCodeData,
      message: 'Pin code updated successfully',
    });
  } catch (error) {
    console.error('Error updating pin code:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Delete pin code
// @route   DELETE /api/pincodes/:id
// @access  Private/Admin
export const deletePinCode = async (req, res) => {
  try {
    const pinCode = await PinCode.findById(req.params.id);
    
    if (!pinCode) {
      return res.status(404).json({
        success: false,
        message: 'Pin code not found',
      });
    }

    await pinCode.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Pin code deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting pin code:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Bulk upload pin codes
// @route   POST /api/pincodes/bulk
// @access  Private/Admin
export const bulkUploadPinCodes = async (req, res) => {
  try {
    const { pinCodes } = req.body;

    if (!Array.isArray(pinCodes) || pinCodes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pin codes array',
      });
    }

    const results = {
      added: 0,
      skipped: 0,
      errors: [],
    };

    for (const pinCodeData of pinCodes) {
      try {
        const existing = await PinCode.findOne({ pinCode: pinCodeData.pinCode });
        
        if (existing) {
          results.skipped++;
          continue;
        }

        await PinCode.create(pinCodeData);
        results.added++;
      } catch (error) {
        results.errors.push({
          pinCode: pinCodeData.pinCode,
          error: error.message,
        });
      }
    }
    
    res.status(200).json({
      success: true,
      data: results,
      message: `Bulk upload completed. Added: ${results.added}, Skipped: ${results.skipped}`,
    });
  } catch (error) {
    console.error('Error in bulk upload:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
