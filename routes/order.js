const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder
} = require("../Controllers/orderController");
const auth = require("../middlewares/auth");
const { ValidationErrors } = require("../validation/validate");

// Validation for creating an order
const validateOrderCreation = [
  body("paymentMethod")
    .isIn(['Credit Card', 'PayPal', 'Apple Pay', 'Google Pay'])
    .withMessage("Invalid payment method"),
  
  body("shippingInfo")
    .isObject()
    .withMessage("Shipping information is required"),
  
  body("shippingInfo.fullName")
    .notEmpty()
    .withMessage("Full name is required"),
  
  body("shippingInfo.email")
    .isEmail()
    .withMessage("Valid email is required"),
  
  body("shippingInfo.phone")
    .notEmpty()
    .withMessage("Phone number is required"),
  
  body("shippingInfo.address")
    .notEmpty()
    .withMessage("Address is required"),
  
  body("shippingInfo.city")
    .notEmpty()
    .withMessage("City is required"),
  
  body("shippingInfo.state")
    .notEmpty()
    .withMessage("State is required"),
  
  body("shippingInfo.zipCode")
    .notEmpty()
    .withMessage("Zip code is required"),
  
  body("shippingInfo.country")
    .notEmpty()
    .withMessage("Country is required")
];

// Allow both regular users and Google users
router.post("/create", auth(["user", "google_user"]), validateOrderCreation, ValidationErrors, createOrder);
router.get("/", auth(["user", "google_user"]), getUserOrders);
router.get("/:orderId", auth(["user", "google_user"]), getOrderById);
router.patch("/cancel/:orderId", auth(["user", "google_user"]), cancelOrder);

module.exports = router;