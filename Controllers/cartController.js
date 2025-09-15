const Cart = require("../models/Cart");
const Product = require("../models/Product");

// Get the user's cart
const getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
      .populate({
        path: 'items.product',
        select: 'name price image sale_percentage price_after_sale type description'
      });

    if (!cart) {
      cart = { items: [], user: req.user._id, newsletterDiscountApplied: false };
    }

    // Calculate total and discounted total
    let cartTotal = 0;
    let discountAmount = 0;

    cart.items.forEach(item => {
      const itemPrice = item.product.price_after_sale || item.product.price;
      cartTotal += itemPrice * item.quantity;
    });

    // Apply newsletter discount if applicable
    if (cart.newsletterDiscountApplied) {
      discountAmount = Math.round(cartTotal * 0.15); 
    }

    res.status(200).json({
      ...cart._doc,
      subtotal: cartTotal,
      discountAmount: discountAmount,
      total: cartTotal - discountAmount + (cart.items.length > 0 ? 50 : 0) // Adding shipping fee
    });
  } catch (error) {
    next(error);
  }
};

// Add item to cart
const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Find or create cart for the user
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    // Check if product already in cart
    const cartItemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (cartItemIndex > -1) {
      // Update quantity if item exists
      cart.items[cartItemIndex].quantity += parseInt(quantity);
    } else {
      // Add new item to cart
      cart.items.push({ product: productId, quantity: parseInt(quantity) });
    }

    await cart.save();

    // Return updated cart with populated product details
    const updatedCart = await Cart.findById(cart._id).populate({
      path: 'items.product',
      select: 'name price image sale_percentage price_after_sale type description'
    });

    res.status(200).json(updatedCart);
  } catch (error) {
    next(error);
  }
};

// Update cart item quantity
const updateCartItem = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ error: "Quantity must be at least 1" });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const cartItemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (cartItemIndex === -1) {
      return res.status(404).json({ error: "Item not found in cart" });
    }

    // Update quantity
    cart.items[cartItemIndex].quantity = parseInt(quantity);
    await cart.save();

    // Return updated cart
    const updatedCart = await Cart.findById(cart._id).populate({
      path: 'items.product',
      select: 'name price image sale_percentage price_after_sale type description'
    });

    res.status(200).json(updatedCart);
  } catch (error) {
    next(error);
  }
};

// Remove item from cart
const removeFromCart = async (req, res, next) => {
  try {
    const { productId } = req.params;

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    // Filter out the item
    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );

    await cart.save();

    // Return updated cart
    const updatedCart = await Cart.findById(cart._id).populate({
      path: 'items.product',
      select: 'name price image sale_percentage price_after_sale type description'
    });

    res.status(200).json(updatedCart);
  } catch (error) {
    next(error);
  }
};

// Clear entire cart
const clearCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    cart.items = [];
    await cart.save();

    res.status(200).json({ message: "Cart cleared successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = { 
  getCart, 
  addToCart, 
  updateCartItem, 
  removeFromCart, 
  clearCart 
};