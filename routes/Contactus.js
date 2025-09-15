const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const {  submitContactForm,getAllContacts} = require("../Controllers/Contactus");
const {validateContactForm,ValidationErrors} = require("../validation/validate");


const upload = require("../middlewares/upload_old");
const auth = require("../middlewares/auth");
const path = require("path");

router.get("/getAllContacts", getAllContacts);

router.post(
  "/submitContactForm",
  validateContactForm,
  ValidationErrors,
  submitContactForm
);


module.exports = router;
