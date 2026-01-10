import User from '../models/User.js';
import Order from '../models/Order.js';
import Replacement from '../models/Replacement.js';

// Helper function to calculate customer stats from orders and replacements
const calculateCustomerStats = (orders, replacements, createdAt) => {
  const validOrders = orders.filter(o => o.orderStatus !== 'Cancelled');
  const totalOrders = orders.length;
  const deliveredOrders = orders.filter(o => o.orderStatus === 'Delivered').length;
  const cancelledOrders = orders.filter(o => o.orderStatus === 'Cancelled').length;
  const pendingOrders = orders.filter(o => o.orderStatus === 'Pending').length;
  const processingOrders = orders.filter(o => o.orderStatus === 'Processing').length;
  const shippedOrders = orders.filter(o => o.orderStatus === 'Shipped').length;
  
  // Calculate delivery fees paid
  const totalDeliveryFees = validOrders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
  
  // Calculate returned items count and value from orders
  let returnedItemsCount = 0;
  let returnedItemsValue = 0;
  let refundedDeliveryFees = 0;
  
  validOrders.forEach(order => {
    let orderReturnedItems = 0;
    let orderTotalItems = order.items.length;
    
    order.items.forEach(item => {
      if (item.returnStatus === 'returned' || item.returnStatus === 'refunded') {
        returnedItemsCount += item.quantity;
        returnedItemsValue += item.subtotal || (item.price * item.quantity);
        orderReturnedItems++;
      }
    });
    
    // If order has deliveryFeeRefunded flag OR all items in order were refunded/returned, include delivery fee
    if (order.deliveryFeeRefunded || (orderReturnedItems === orderTotalItems && orderTotalItems > 0)) {
      refundedDeliveryFees += order.deliveryFee || 0;
    }
  });
  
  // Total refunded is items value + delivery fees refunded
  const totalRefunded = returnedItemsValue + refundedDeliveryFees;
  
  // Calculate total spent minus refunded amount (including delivery fees)
  const grossSpent = validOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const totalSpent = grossSpent - totalRefunded;
  
  // Calculate items excluding returned
  const totalItems = validOrders.reduce((sum, o) => 
    sum + o.items.reduce((itemSum, item) => {
      if (item.returnStatus === 'returned' || item.returnStatus === 'refunded') {
        return itemSum; // Don't count returned items
      }
      return itemSum + item.quantity;
    }, 0), 0);
  const totalCouponSavings = validOrders.reduce((sum, o) => sum + (o.couponDiscount || 0), 0);
  
  const sortedOrders = [...orders].sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
  const lastOrderDate = sortedOrders.length > 0 ? sortedOrders[0].orderDate : null;
  const firstOrderDate = sortedOrders.length > 0 ? sortedOrders[sortedOrders.length - 1].orderDate : null;
  
  const averageOrderValue = validOrders.length > 0 
    ? Math.round((totalSpent / validOrders.length) * 100) / 100 
    : 0;

  // Calculate order frequency (average days between orders)
  let orderFrequencyDays = 0;
  if (validOrders.length > 1) {
    const firstDate = new Date(firstOrderDate);
    const lastDate = new Date(lastOrderDate);
    const daysBetween = Math.floor((lastDate - firstDate) / (1000 * 60 * 60 * 24));
    orderFrequencyDays = Math.round(daysBetween / (validOrders.length - 1));
  }

  // Calculate account age
  const accountAgeDays = Math.floor((new Date() - new Date(createdAt)) / (1000 * 60 * 60 * 24));

  // Calculate customer lifetime value (CLV) - simple calculation
  const monthsActive = Math.max(1, accountAgeDays / 30);
  const monthlySpend = totalSpent / monthsActive;
  const estimatedLifetimeValue = Math.round(monthlySpend * 24 * 100) / 100; // Project 24 months

  return {
    totalOrders,
    deliveredOrders,
    cancelledOrders,
    pendingOrders,
    processingOrders,
    shippedOrders,
    totalSpent: Math.round(totalSpent * 100) / 100,
    grossSpent: Math.round(grossSpent * 100) / 100,
    totalItems,
    totalDeliveryFees: Math.round(totalDeliveryFees * 100) / 100,
    returnedItemsCount,
    returnedItemsValue: Math.round(returnedItemsValue * 100) / 100,
    refundedDeliveryFees: Math.round(refundedDeliveryFees * 100) / 100,
    totalRefunded: Math.round(totalRefunded * 100) / 100,
    totalCouponSavings: Math.round(totalCouponSavings * 100) / 100,
    averageOrderValue,
    lastOrderDate,
    firstOrderDate,
    orderFrequencyDays,
    accountAgeDays,
    estimatedLifetimeValue,
  };
};

// @desc    Get all customers with analytics
// @route   GET /api/customers/admin
// @access  Private/Admin
export const getAllCustomers = async (req, res) => {
  try {
    const users = await User.find({ role: 'user' })
      .select('-passwordHash -resetPasswordToken -resetPasswordExpire')
      .sort({ createdAt: -1 });

    // Get order statistics for each user
    const customersWithStats = await Promise.all(
      users.map(async (user) => {
        const orders = await Order.find({ user: user._id });
        const replacements = await Replacement.find({ user: user._id });
        const stats = calculateCustomerStats(orders, replacements, user.createdAt);

        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          authProvider: user.authProvider,
          createdAt: user.createdAt,
          wishlistCount: user.wishlist?.length || 0,
          addressCount: user.addresses?.length || 0,
          cartItemsCount: user.cart?.length || 0,
          stats,
        };
      })
    );

    res.json({
      success: true,
      data: customersWithStats,
      total: customersWithStats.length,
    });
  } catch (error) {
    console.error('Get all customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get single customer details with full analytics
// @route   GET /api/customers/admin/:id
// @access  Private/Admin
export const getCustomerDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-passwordHash -resetPasswordToken -resetPasswordExpire')
      .populate('wishlist');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    // Get all orders
    const orders = await Order.find({ user: user._id }).sort({ orderDate: -1 });

    // Fetch all replacements for this customer (moved earlier to pass to calculateCustomerStats)
    const replacements = await Replacement.find({ user: user._id })
      .populate('order', 'orderDate grandTotal deliveryFee itemsTotal couponDiscount')
      .sort({ createdAt: -1 });

    // Calculate statistics using helper function
    const stats = calculateCustomerStats(orders, replacements, user.createdAt);

    // Get purchased products breakdown
    const productsPurchased = {};
    orders
      .filter(o => o.orderStatus !== 'Cancelled')
      .forEach(order => {
        order.items.forEach(item => {
          const key = item.product?.toString() || item.name;
          if (!productsPurchased[key]) {
            productsPurchased[key] = {
              productId: item.product,
              name: item.name,
              image: item.image,
              quantity: 0,
              totalSpent: 0,
              purchaseCount: 0,
            };
          }
          productsPurchased[key].quantity += item.quantity;
          productsPurchased[key].totalSpent += item.subtotal || (item.price * item.quantity);
          productsPurchased[key].purchaseCount += 1;
        });
      });

    const topProducts = Object.values(productsPurchased)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Calculate monthly spending trends (last 12 months)
    const monthlySpending = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthOrders = orders.filter(o => {
        const orderDate = new Date(o.orderDate);
        return orderDate >= monthStart && orderDate <= monthEnd && o.orderStatus !== 'Cancelled';
      });
      
      const spent = monthOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
      const orderCount = monthOrders.length;
      const itemCount = monthOrders.reduce((sum, o) => 
        sum + o.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);

      monthlySpending.push({
        month: monthStart.toLocaleString('default', { month: 'short', year: '2-digit' }),
        spent: Math.round(spent * 100) / 100,
        orders: orderCount,
        items: itemCount,
      });
    }

    // Category-wise spending
    const categorySpending = {};
    orders
      .filter(o => o.orderStatus !== 'Cancelled')
      .forEach(order => {
        order.items.forEach(item => {
          // Try to get category from the product reference or use 'Other'
          const category = item.category || 'Other';
          if (!categorySpending[category]) {
            categorySpending[category] = {
              category,
              totalSpent: 0,
              quantity: 0,
            };
          }
          categorySpending[category].totalSpent += item.subtotal || (item.price * item.quantity);
          categorySpending[category].quantity += item.quantity;
        });
      });

    const categoryBreakdown = Object.values(categorySpending)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    // Calculate replacement statistics (replacements already fetched earlier)
    const replacementStats = {
      total: replacements.length,
      pending: replacements.filter(r => r.status === 'Requested').length,
      approved: replacements.filter(r => ['Approved', 'Pickup Scheduled', 'Picked Up'].includes(r.status)).length,
      completed: replacements.filter(r => r.status === 'Completed').length,
      refunded: replacements.filter(r => r.status === 'Refunded').length,
      rejected: replacements.filter(r => r.status === 'Rejected').length,
      totalRefundAmount: replacements
        .filter(r => r.status === 'Refunded' && r.refund?.amount)
        .reduce((sum, r) => sum + (r.refund.amount || 0), 0),
    };

    res.json({
      success: true,
      data: {
        customer: {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          authProvider: user.authProvider,
          createdAt: user.createdAt,
          addresses: user.addresses || [],
          wishlist: user.wishlist || [],
          cartItems: user.cart || [],
          settings: user.settings || {},
        },
        stats,
        orders,
        topProducts,
        monthlySpending,
        categoryBreakdown,
        replacements,
        replacementStats,
      },
    });
  } catch (error) {
    console.error('Get customer details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get customers matching coupon criteria
// @route   POST /api/customers/admin/match-criteria
// @access  Private/Admin
export const getMatchingCustomers = async (req, res) => {
  try {
    const {
      userType,
      minTotalPurchase,
      maxTotalPurchase,
      minOrderCount,
      maxOrderCount,
      registeredDaysAgo,
      hasWishlistItems,
    } = req.body;

    const users = await User.find({ role: 'user' }).select('_id name email createdAt wishlist');
    
    const matchingUsers = [];

    for (const user of users) {
      const orders = await Order.find({ user: user._id, orderStatus: { $ne: 'Cancelled' } });
      const replacements = await Replacement.find({ user: user._id });
      const stats = calculateCustomerStats(orders, replacements, user.createdAt);
      const wishlistCount = user.wishlist?.length || 0;

      let matches = true;

      // User type check
      if (userType === 'new' && stats.totalOrders > 0) matches = false;
      if (userType === 'existing' && stats.totalOrders === 0) matches = false;

      // Purchase amount check
      if (minTotalPurchase && stats.totalSpent < minTotalPurchase) matches = false;
      if (maxTotalPurchase && stats.totalSpent > maxTotalPurchase) matches = false;

      // Order count check
      if (minOrderCount && stats.totalOrders < minOrderCount) matches = false;
      if (maxOrderCount && stats.totalOrders > maxOrderCount) matches = false;

      // Registration age check
      if (registeredDaysAgo && stats.accountAgeDays < registeredDaysAgo) matches = false;

      // Wishlist check
      if (hasWishlistItems === true && wishlistCount === 0) matches = false;
      if (hasWishlistItems === false && wishlistCount > 0) matches = false;

      if (matches) {
        matchingUsers.push({
          _id: user._id,
          name: user.name,
          email: user.email,
          totalSpent: stats.totalSpent,
          orderCount: stats.totalOrders,
          accountAgeDays: stats.accountAgeDays,
          wishlistCount,
        });
      }
    }

    res.json({
      success: true,
      data: matchingUsers,
      count: matchingUsers.length,
    });
  } catch (error) {
    console.error('Get matching customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get customer statistics summary
// @route   GET /api/customers/admin/stats
// @access  Private/Admin
export const getCustomerStats = async (req, res) => {
  try {
    const totalCustomers = await User.countDocuments({ role: 'user' });
    
    // Get customers registered in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newCustomers = await User.countDocuments({
      role: 'user',
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Get all orders for aggregate analytics
    const allOrders = await Order.find({ orderStatus: { $ne: 'Cancelled' } });
    
    // Unique customers with orders
    const customersWithOrderIds = [...new Set(allOrders.map(o => o.user.toString()))];
    const uniqueCustomersWithOrders = customersWithOrderIds.length;

    // Get customers with wishlist items
    const customersWithWishlist = await User.countDocuments({
      role: 'user',
      'wishlist.0': { $exists: true },
    });

    // Calculate total revenue from all customers
    const totalRevenue = allOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
    
    // Calculate total replacement/refund value
    const allReplacements = await Replacement.find({ status: { $in: ['Refunded', 'Completed'] } });
    const totalReplacementValue = allReplacements.reduce((sum, r) => {
      const itemTotal = r.items?.reduce((itemSum, item) => itemSum + ((item.price || 0) * (item.quantity || 1)), 0) || 0;
      return sum + itemTotal;
    }, 0);
    
    // Total Spent = Total Revenue - Replacement Value
    const totalSpent = Math.round((totalRevenue - totalReplacementValue) * 100) / 100;
    
    // Calculate total items sold
    const totalItemsSold = allOrders.reduce((sum, o) => 
      sum + o.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);

    // Average customer value
    const averageCustomerValue = uniqueCustomersWithOrders > 0 
      ? Math.round((totalRevenue / uniqueCustomersWithOrders) * 100) / 100 
      : 0;

    // Average order value
    const averageOrderValue = allOrders.length > 0 
      ? Math.round((totalRevenue / allOrders.length) * 100) / 100 
      : 0;

    // Customers with cart items (potential buyers)
    const customersWithCart = await User.countDocuments({
      role: 'user',
      'cart.0': { $exists: true },
    });

    // Repeat customers (more than 1 order)
    const orderCountByCustomer = {};
    allOrders.forEach(o => {
      const userId = o.user.toString();
      orderCountByCustomer[userId] = (orderCountByCustomer[userId] || 0) + 1;
    });
    const repeatCustomers = Object.values(orderCountByCustomer).filter(count => count > 1).length;

    // Top spending customers (top 5)
    const spendingByCustomer = {};
    allOrders.forEach(o => {
      const userId = o.user.toString();
      spendingByCustomer[userId] = (spendingByCustomer[userId] || 0) + (o.grandTotal || 0);
    });
    
    const topSpendersIds = Object.entries(spendingByCustomer)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);
    
    const topSpenders = await User.find({ _id: { $in: topSpendersIds } })
      .select('name email avatar');
    
    const topSpendersWithAmount = topSpenders.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      totalSpent: Math.round(spendingByCustomer[user._id.toString()] * 100) / 100,
    })).sort((a, b) => b.totalSpent - a.totalSpent);

    // Customer registration trends (last 6 months)
    const registrationTrends = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const count = await User.countDocuments({
        role: 'user',
        createdAt: { $gte: monthStart, $lte: monthEnd },
      });
      
      registrationTrends.push({
        month: monthStart.toLocaleString('default', { month: 'short', year: '2-digit' }),
        count,
      });
    }

    res.json({
      success: true,
      data: {
        totalCustomers,
        newCustomers,
        customersWithOrders: uniqueCustomersWithOrders,
        customersWithWishlist,
        customersWithCart,
        repeatCustomers,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalReplacementValue: Math.round(totalReplacementValue * 100) / 100,
        totalSpent,
        totalItemsSold,
        averageCustomerValue,
        averageOrderValue,
        topSpenders: topSpendersWithAmount,
        registrationTrends,
      },
    });
  } catch (error) {
    console.error('Get customer stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
