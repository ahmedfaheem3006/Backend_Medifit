const { body, validationResult } = require("express-validator");
const User = require("../models/User");

const ValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const validateregister = [
  body("username")
    .isString()
    .withMessage("Name must be a string")
    .notEmpty()
    .withMessage("Name must be non-empty"),
  body("email").isEmail().withMessage("Email must be a valid email address"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

const validateLogin = [
  body("email").isEmail().withMessage("Email must be a valid email address"),
  body("password").notEmpty().withMessage("Password must be provided"),
];

const validatepromoteUser = [
  body("userId").notEmpty().withMessage("User ID must be provided"),
  body("role")
    .isIn(["user", "admin", "supervisor"])
    .withMessage("Role must be one of user, admin, or supervisor"),
];

const validateProduct = [
  body("type")
    .isString()
    .withMessage("Type must be a string")
    .notEmpty()
    .withMessage("Type is required")
    .trim(),

  body("rating")
    .isString()
    .withMessage("Rating must be a string")
    .notEmpty()
    .withMessage("Rating is required")
    .isIn(["1", "2", "3", "4", "5"])
    .withMessage("Rating must be between 1 and 5")
    .trim(),

  body("name")
    .isString()
    .withMessage("Name must be a string")
    .notEmpty()
    .withMessage("Name is required")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),

  body("price")
    .notEmpty()
    .withMessage("Price is required")
    .isNumeric()
    .withMessage("Price must be a number")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),

  body("sale_percentage")
    .optional()
    .isNumeric()
    .withMessage("Sale percentage must be a number")
    .isFloat({ min: 0, max: 100 })
    .withMessage("Sale percentage must be between 0 and 100"),

  body("price_after_sale")
    .optional()
    .isNumeric()
    .withMessage("Price after sale must be a number")
    .isFloat({ min: 0 })
    .withMessage("Price after sale must be a positive number"),

  body("description")
    .isString()
    .withMessage("Description must be a string")
    .notEmpty()
    .withMessage("Description is required")
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Description must be between 10 and 1000 characters"),

  body("key_benefits")
    .isString()
    .withMessage("Key benefits must be a string")
    .notEmpty()
    .withMessage("Key benefits are required")
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage("Key benefits must be between 10 and 500 characters"),
];

const validateEditproduct = [
  body("type")
    .optional()
    .isString()
    .withMessage("Type must be a string")
    .notEmpty()
    .withMessage("Type cannot be empty if provided")
    .trim(),

  body("rating")
    .optional()
    .isString()
    .withMessage("Rating must be a string")
    .notEmpty()
    .withMessage("Rating cannot be empty if provided")
    .isIn(["1", "2", "3", "4", "5"])
    .withMessage("Rating must be between 1 and 5")
    .trim(),

  body("name")
    .optional()
    .isString()
    .withMessage("Name must be a string")
    .notEmpty()
    .withMessage("Name cannot be empty if provided")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),

  body("price")
    .optional()
    .isNumeric()
    .withMessage("Price must be a number")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),

  body("sale_percentage")
    .optional()
    .isNumeric()
    .withMessage("Sale percentage must be a number")
    .isFloat({ min: 0, max: 100 })
    .withMessage("Sale percentage must be between 0 and 100"),

  body("price_after_sale")
    .optional()
    .isNumeric()
    .withMessage("Price after sale must be a number")
    .isFloat({ min: 0 })
    .withMessage("Price after sale must be a positive number"),

  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string")
    .notEmpty()
    .withMessage("Description cannot be empty if provided")
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Description must be between 10 and 1000 characters"),

  body("key_benefits")
    .optional()
    .isString()
    .withMessage("Key benefits must be a string")
    .notEmpty()
    .withMessage("Key benefits cannot be empty if provided")
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage("Key benefits must be between 10 and 500 characters"),
];

const validateDeleteAllproduct = [
  body("password")
    .isString()
    .withMessage("Password must be a string")
    .notEmpty()
    .withMessage("Password must be provided"),
];

const validateContactForm = [
  body("fullName")
    .isString()
    .withMessage("Full name must be a string")
    .notEmpty()
    .withMessage("Full name is required")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be between 2 and 100 characters"),

  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("phone")
    .notEmpty()
    .withMessage("Phone number is required")
    .trim()
    .matches(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/)
    .withMessage("Please provide a valid phone number"),

  body("schedule")
    .notEmpty()
    .withMessage("Schedule date is required")
    .isISO8601()
    .withMessage("Please provide a valid date in YYYY-MM-DD format"),

  body("message")
    .isString()
    .withMessage("Message must be a string")
    .notEmpty()
    .withMessage("Message is required")
    .trim()
    .isLength({ min: 10, max: 3000 })
    .withMessage("Message must be between 10 and 1000 characters"),
];

module.exports = {
  ValidationErrors,
  validateregister,
  validateLogin,
  validatepromoteUser,
  validateProduct,
  validateEditproduct,
  validateDeleteAllproduct,
  validateContactForm,
};

// const { body , validationResult } = require('express-validator');
// const User = require("../models/User");
// const mongoose = require("mongoose");

// const ValidationErrors = (req, res, next) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ errors: errors.array() });
//     }
//     next();
//   };

// const validateregister = [
//     body('username').isString().withMessage('Name must be string').notEmpty().withMessage("Name must be a non-empty"),
//     body('email').isEmail().withMessage("Email must be a valid email address"),
//     body('password').isLength({ min: 6 }).withMessage("Password must be at least 6 characters long")
//     ];

// const validateLogin = [
//     body("email").isEmail().withMessage('Email must be a valid email address'),
//     body("password").notEmpty().withMessage('Password must be provided')
//     ];

// const validatepromoteUser = [
//     body('userId').withMessage("Name must be a non-empty"),
//     body('role').isIn(['user', 'admin', 'supervisor'])
//     ];

// const validateProduct = [
//     body('name').isString().withMessage('Name must be string').notEmpty().withMessage("Name must be a non-empty"),
//     body('description').isString().withMessage('Name must be string').notEmpty().withMessage("Name must be a non-empty"),
//     body('price').isNumeric().withMessage('Price must be a Number')
//     ];

// const validateEditproduct = [
//     body('name').optional().notEmpty(),
//     body('description').optional().notEmpty(),
//     body('price').optional().isNumeric()
//     ];

// module.exports = { ValidationErrors , validateregister , validateLogin , validatepromoteUser , validateProduct , validateEditproduct };
