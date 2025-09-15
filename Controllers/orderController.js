const Order = require("../models/Order");
const Cart = require("../models/Cart");
const User = require("../models/User");

// Create a new order
const createOrder = async (req, res, next) => {
  try {
    const { paymentMethod, shippingInfo } = req.body;

    // Get user's cart
    const cart = await Cart.findOne({ user: req.user._id }).populate({
      path: 'items.product',
      select: 'name price image sale_percentage price_after_sale'
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // Calculate prices
    const subtotalPrice = cart.items.reduce((total, item) => {
      const price = item.product.price_after_sale || item.product.price;
      return total + (price * item.quantity);
    }, 0);

    let discountAmount = 0;
    if (cart.newsletterDiscountApplied) {
      discountAmount = Math.round(subtotalPrice * 0.15); // 15% discount
    }

    const shippingFee = 50;
    const totalPrice = subtotalPrice + shippingFee;

    // Create order products from cart items
    const products = cart.items.map(item => ({
      product: item.product._id,
      name: item.product.name,
      price: item.product.price,
      price_after_sale: item.product.price_after_sale,
      image: item.product.image,
      quantity: item.quantity
    }));

    // Generate orderId manually
    const date = new Date();
    const timestamp = date.getTime().toString().slice(-8);
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    const orderId = `ORD-${timestamp}-${randomStr}`;

    // Create new order with orderId
    const order = new Order({
      orderId: orderId, // Set the orderId manually
      user: req.user._id,
      products,
      subtotalPrice,
      shippingFee,
      totalPrice,
      paymentMethod,
      shippingInfo,
      status: 'Processing',
      newsletterDiscountApplied: cart.newsletterDiscountApplied
    });

    await order.save();

    // Clear user's cart after successful order
    cart.items = [];
    await cart.save();

    res.status(201).json({
      message: "Order created successfully",
      order: {
        orderId: order.orderId,
        totalPrice: order.totalPrice,
        status: order.status
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get all orders for the logged-in user
const getUserOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ orderDate: -1 })
      .populate({
        path: 'products.product',
        select: 'name type'
      });

    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
};

// Get order by ID
const getOrderById = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ 
      orderId: orderId,
      user: req.user._id
    }).populate({
      path: 'products.product',
      select: 'name type'
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
};

// Cancel an order
const cancelOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ 
      orderId: orderId,
      user: req.user._id
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Can only cancel if order is in Processing state
    if (order.status !== 'Processing') {
      return res.status(400).json({ 
        error: `Cannot cancel order with status: ${order.status}` 
      });
    }

    order.status = 'Cancelled';
    await order.save();

    res.status(200).json({ 
      message: "Order cancelled successfully",
      orderId: order.orderId
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder
};