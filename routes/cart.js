const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require("../Controllers/cartController");
const auth = require("../middlewares/auth");
const { ValidationErrors } = require("../validation/validate");

// Validation for adding/updating cart items
const validateCartItem = [
  body("productId")
    .notEmpty()
    .withMessage("Product ID is required")
    .isMongoId()
    .withMessage("Invalid product ID format"),
  body("quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),
];

// Allow both "user" role and Google users (with empty array to check auth but not restrict by role)
router.get("/", auth(["user", "google_user"]), getCart);
router.post("/add", auth(["user", "google_user"]), validateCartItem, ValidationErrors, addToCart);
router.patch("/update", auth(["user", "google_user"]), validateCartItem, ValidationErrors, updateCartItem);
router.delete("/remove/:productId", auth(["user", "google_user"]), removeFromCart);
router.delete("/clear", auth(["user", "google_user"]), clearCart);

module.exports = router;