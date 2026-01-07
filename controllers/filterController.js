import Filter from '../models/Filter.js';

// @desc    Get all active filters
// @route   GET /api/filters
// @access  Public
export const getFilters = async (req, res) => {
  try {
    const filters = await Filter.find({ isActive: true }).sort({ order: 1 });
    
    res.json({
      success: true,
      data: filters,
    });
  } catch (error) {
    console.error('Get filters error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get filters',
      error: error.message,
    });
  }
};

// @desc    Get all filters (including inactive) for admin
// @route   GET /api/filters/admin
// @access  Private/Admin
export const getAllFilters = async (req, res) => {
  try {
    const filters = await Filter.find().sort({ order: 1 });
    
    res.json({
      success: true,
      data: filters,
    });
  } catch (error) {
    console.error('Get all filters error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get filters',
      error: error.message,
    });
  }
};

// @desc    Create a new filter
// @route   POST /api/filters
// @access  Private/Admin
export const createFilter = async (req, res) => {
  try {
    const { name, key, type, options, productField, isActive, order } = req.body;

    // Check if filter key already exists
    const existingFilter = await Filter.findOne({ key: key.toLowerCase() });
    if (existingFilter) {
      return res.status(400).json({
        success: false,
        message: 'Filter with this key already exists',
      });
    }

    const filter = await Filter.create({
      name,
      key: key.toLowerCase(),
      type: type || 'radio',
      options: options || [],
      productField: productField || 'tags',
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0,
    });

    res.status(201).json({
      success: true,
      data: filter,
      message: 'Filter created successfully',
    });
  } catch (error) {
    console.error('Create filter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create filter',
      error: error.message,
    });
  }
};

// @desc    Update a filter
// @route   PUT /api/filters/:id
// @access  Private/Admin
export const updateFilter = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, key, type, options, productField, isActive, order } = req.body;

    const filter = await Filter.findById(id);
    if (!filter) {
      return res.status(404).json({
        success: false,
        message: 'Filter not found',
      });
    }

    // Check if new key conflicts with another filter
    if (key && key.toLowerCase() !== filter.key) {
      const existingFilter = await Filter.findOne({ key: key.toLowerCase() });
      if (existingFilter) {
        return res.status(400).json({
          success: false,
          message: 'Filter with this key already exists',
        });
      }
    }

    filter.name = name || filter.name;
    filter.key = key ? key.toLowerCase() : filter.key;
    filter.type = type || filter.type;
    filter.options = options || filter.options;
    filter.productField = productField || filter.productField;
    filter.isActive = isActive !== undefined ? isActive : filter.isActive;
    filter.order = order !== undefined ? order : filter.order;

    await filter.save();

    res.json({
      success: true,
      data: filter,
      message: 'Filter updated successfully',
    });
  } catch (error) {
    console.error('Update filter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update filter',
      error: error.message,
    });
  }
};

// @desc    Delete a filter
// @route   DELETE /api/filters/:id
// @access  Private/Admin
export const deleteFilter = async (req, res) => {
  try {
    const { id } = req.params;

    const filter = await Filter.findByIdAndDelete(id);
    if (!filter) {
      return res.status(404).json({
        success: false,
        message: 'Filter not found',
      });
    }

    res.json({
      success: true,
      message: 'Filter deleted successfully',
    });
  } catch (error) {
    console.error('Delete filter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete filter',
      error: error.message,
    });
  }
};

// @desc    Add option to a filter
// @route   POST /api/filters/:id/options
// @access  Private/Admin
export const addFilterOption = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, value } = req.body;

    const filter = await Filter.findById(id);
    if (!filter) {
      return res.status(404).json({
        success: false,
        message: 'Filter not found',
      });
    }

    // Check if option value already exists
    const existingOption = filter.options.find(opt => opt.value === value);
    if (existingOption) {
      return res.status(400).json({
        success: false,
        message: 'Option with this value already exists',
      });
    }

    filter.options.push({ label, value });
    await filter.save();

    res.json({
      success: true,
      data: filter,
      message: 'Option added successfully',
    });
  } catch (error) {
    console.error('Add filter option error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add option',
      error: error.message,
    });
  }
};

// @desc    Remove option from a filter
// @route   DELETE /api/filters/:id/options/:optionId
// @access  Private/Admin
export const removeFilterOption = async (req, res) => {
  try {
    const { id, optionId } = req.params;

    const filter = await Filter.findById(id);
    if (!filter) {
      return res.status(404).json({
        success: false,
        message: 'Filter not found',
      });
    }

    filter.options = filter.options.filter(opt => opt._id.toString() !== optionId);
    await filter.save();

    res.json({
      success: true,
      data: filter,
      message: 'Option removed successfully',
    });
  } catch (error) {
    console.error('Remove filter option error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove option',
      error: error.message,
    });
  }
};
