const express = require('express');
const router = express.Router();
const User = require('../models/User');
const googleuser = require('../models/googleuser');
const Order = require('../models/Order');
const Product = require('../models/Product');
const OrderCompleted = require('../models/OrderCompleted');
const jwt = require('jsonwebtoken');
const path = require('path');

// Middleware to verify admin role
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get total users count (User + googleuser)
router.get('/users/count', verifyAdmin, async (req, res, next) => {
  try {
    const count = await User.countDocuments();
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

router.get('/google-users/count', verifyAdmin, async (req, res, next) => {
  try {
    const count = await googleuser.countDocuments();
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

// Get orders stats (total count and revenue for Processing orders only)
router.get('/orders/stats', verifyAdmin, async (req, res, next) => {
  try {
    const orders = await Order.find({ status: 'Processing' });
    const count = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);
    res.json({ count, totalRevenue });
  } catch (error) {
    next(error);
  }
});

// Get top 5 products by sales
router.get('/products/top', verifyAdmin, async (req, res, next) => {
  try {
    const orders = await Order.find({ status: { $ne: 'Cancelled' } });
    const completedOrders = await OrderCompleted.find();
    
    const productSales = {};

    orders.forEach(order => {
      order.products.forEach(product => {
        if (productSales[product.name]) {
          productSales[product.name] += product.quantity;
        } else {
          productSales[product.name] = product.quantity;
        }
      });
    });

    completedOrders.forEach(order => {
      order.products.forEach(product => {
        if (productSales[product.name]) {
          productSales[product.name] += product.quantity;
        } else {
          productSales[product.name] = product.quantity;
        }
      });
    });

    const topProductNames = Object.entries(productSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    const topProductsWithImages = [];
    
    for (const productName of topProductNames) {
      const product = await Product.findOne({ name: productName });
      if (product) {
        const imageUrl = product.image ? `http://localhost:5500/uploads/${product.image}` : null;
        topProductsWithImages.push({
          name: productName,
          salesCount: productSales[productName],
          image: imageUrl,
          price: product.price
        });
      }
    }

    res.json(topProductsWithImages);
  } catch (error) {
    next(error);
  }
});

// Get pending orders with user names
router.get('/orders/pending', verifyAdmin, async (req, res, next) => {
  try {
    const orders = await Order.find({ status: 'Processing' })
      .populate('user', 'username');
    const formattedOrders = orders.map(order => ({
      orderId: order.orderId,
      userName: order.user ? order.user.username : 'Unknown',
      products: order.products,
      totalPrice: order.totalPrice,
      orderDate: order.orderDate
    }));
    res.json(formattedOrders);
  } catch (error) {
    next(error);
  }
});

// Approve order and move to completed orders
router.patch('/orders/approve/:orderId', verifyAdmin, async (req, res, next) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId })
      .populate('user', 'username email');
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const paymentMethodMap = {
      'Credit Card': 'credit_card',
      'PayPal': 'paypal',
      'Apple Pay': 'cash_on_delivery',
      'Google Pay': 'cash_on_delivery'
    };

    // نسخ كل بيانات shippingInfo مباشرة
    const completedOrder = new OrderCompleted({
      orderId: order.orderId,
      user: order.user,
      products: order.products.map(product => ({
        productId: product.product,
        name: product.name,
        price: product.price,
        quantity: product.quantity,
        image: product.image
      })),
      totalPrice: order.totalPrice,
      paymentMethod: paymentMethodMap[order.paymentMethod] || 'cash_on_delivery',
      shippingInfo: {
        fullName: order.shippingInfo.fullName,
        email: order.shippingInfo.email,
        phone: order.shippingInfo.phone,
        address: order.shippingInfo.address,
        city: order.shippingInfo.city,
        state: order.shippingInfo.state,
        zipCode: order.shippingInfo.zipCode,
        country: order.shippingInfo.country,
        notes: order.shippingInfo.notes
      },
      orderDate: order.orderDate,
      completedDate: new Date()
    });

    await completedOrder.save();
    await Order.findOneAndDelete({ orderId: req.params.orderId });

    res.json({ 
      message: `Order ${req.params.orderId} approved and moved to completed orders`,
      completedOrder: {
        orderId: completedOrder.orderId,
        user: {
          username: completedOrder.user.username,
          email: completedOrder.user.email
        },
        totalPrice: completedOrder.totalPrice,
        completedDate: completedOrder.completedDate,
        products: completedOrder.products
      }
    });
  } catch (error) {
    console.error('Error approving order:', error);
    next(error);
  }
});

// Reject order
router.patch('/orders/reject/:orderId', verifyAdmin, async (req, res, next) => {
  try {
    const order = await Order.findOneAndUpdate(
      { orderId: req.params.orderId },
      { status: 'Cancelled' },
      { new: true }
    );
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ message: `Order ${req.params.orderId} rejected` });
  } catch (error) {
    next(error);
  }
});

// Get completed orders with user details
router.get('/orders/completed', verifyAdmin, async (req, res, next) => {
  try {
    const completedOrders = await OrderCompleted.find()
      .populate('user', 'username email')
      .sort({ completedDate: -1 });
    
    res.json(completedOrders);
  } catch (error) {
    next(error);
  }
});

// Get completed orders stats
router.get('/orders/completed/stats', verifyAdmin, async (req, res, next) => {
  try {
    const completedOrders = await OrderCompleted.find();
    const count = completedOrders.length;
    const totalRevenue = completedOrders.reduce((sum, order) => sum + order.totalPrice, 0);
    
    res.json({ 
      completedCount: count, 
      completedRevenue: totalRevenue 
    });
  } catch (error) {
    next(error);
  }
});

// Get daily sales
router.get('/orders/daily', verifyAdmin, async (req, res, next) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);
    
    const orders = await Order.aggregate([
      {
        $match: {
          status: 'Processing',
          orderDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$orderDate' } },
          total: { $sum: '$totalPrice' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    const completedOrders = await OrderCompleted.aggregate([
      {
        $match: {
          completedDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedDate' } },
          total: { $sum: '$totalPrice' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const combinedData = {};
    orders.forEach(o => {
      combinedData[o._id] = (combinedData[o._id] || 0) + o.total;
    });
    completedOrders.forEach(o => {
      combinedData[o._id] = (combinedData[o._id] || 0) + o.total;
    });

    const result = Object.entries(combinedData)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get monthly sales
router.get('/orders/monthly', verifyAdmin, async (req, res, next) => {
  try {
    const orders = await Order.aggregate([
      {
        $match: { status: 'Processing' }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$orderDate' } },
          total: { $sum: '$totalPrice' }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 6 }
    ]);
    
    const completedOrders = await OrderCompleted.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$completedDate' } },
          total: { $sum: '$totalPrice' }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 6 }
    ]);

    const combinedData = {};
    orders.forEach(o => {
      combinedData[o._id] = (combinedData[o._id] || 0) + o.total;
    });
    completedOrders.forEach(o => {
      combinedData[o._id] = (combinedData[o._id] || 0) + o.total;
    });

    const result = Object.entries(combinedData)
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get yearly sales
router.get('/orders/yearly', verifyAdmin, async (req, res, next) => {
  try {
    const orders = await Order.aggregate([
      {
        $match: { status: 'Processing' }
      },
      {
        $group: {
          _id: { $year: '$orderDate' },
          total: { $sum: '$totalPrice' }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 5 }
    ]);
    
    const completedOrders = await OrderCompleted.aggregate([
      {
        $group: {
          _id: { $year: '$completedDate' },
          total: { $sum: '$totalPrice' }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 5 }
    ]);

    const combinedData = {};
    orders.forEach(o => {
      combinedData[o._id] = (combinedData[o._id] || 0) + o.total;
    });
    completedOrders.forEach(o => {
      combinedData[o._id] = (combinedData[o._id] || 0) + o.total;
    });

    const result = Object.entries(combinedData)
      .map(([year, total]) => ({ year: parseInt(year), total }))
      .sort((a, b) => a.year - b.year);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;