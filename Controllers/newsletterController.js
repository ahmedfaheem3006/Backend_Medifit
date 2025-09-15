const Subscriber = require("../models/Subscriber");
const User = require("../models/User");
const Cart = require("../models/Cart");

// Subscribe to newsletter
const subscribe = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Check if email is already subscribed
    const existingSubscriber = await Subscriber.findOne({ email: email.toLowerCase() });
    if (existingSubscriber) {
      return res.status(200).json({ 
        message: "Email is already subscribed",
        alreadySubscribed: true
      });
    }

    // Create new subscriber
    const subscriber = new Subscriber({
      email: email.toLowerCase(),
      user: req.user ? req.user._id : null
    });

    await subscriber.save();

    res.status(201).json({ 
      message: "Successfully subscribed to the newsletter", 
      discountEligible: true
    });
  } catch (error) {
    next(error);
  }
};

// Apply newsletter discount to cart
const applyDiscount = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User must be logged in" });
    }

    const email = req.user.email.toLowerCase();

    // Check if user is subscribed
    const subscriber = await Subscriber.findOne({ email });
    if (!subscriber) {
      return res.status(400).json({ error: "Email not subscribed to newsletter" });
    }

    // Check if discount already used
    if (subscriber.discountUsed) {
      return res.status(400).json({ error: "Newsletter discount has already been used" });
    }

    // Get user's cart
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // Apply the discount
    cart.newsletterDiscountApplied = true;
    await cart.save();

    // Mark the discount as used
    subscriber.discountUsed = true;
    await subscriber.save();

    res.status(200).json({ 
      message: "15% newsletter discount applied to cart",
      cart: cart
    });
  } catch (error) {
    next(error);
  }
};

// Check if user is eligible for discount
const checkDiscountEligibility = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User must be logged in" });
    }

    const email = req.user.email.toLowerCase();

    // Check if user is subscribed
    const subscriber = await Subscriber.findOne({ email });
    if (!subscriber) {
      return res.status(200).json({ eligible: false, reason: "not_subscribed" });
    }

    // Check if discount already used
    if (subscriber.discountUsed) {
      return res.status(200).json({ eligible: false, reason: "already_used" });
    }

    // Check if cart has discount applied
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart && cart.newsletterDiscountApplied) {
      return res.status(200).json({ eligible: false, reason: "already_applied" });
    }

    res.status(200).json({ eligible: true });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  subscribe,
  applyDiscount,
  checkDiscountEligibility
};