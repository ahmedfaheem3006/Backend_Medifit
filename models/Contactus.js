// models/Contact.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ContactSchema = new Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  schedule: { type: Date, required: true },
  message: { type: String, required: true }
});

const Contact = mongoose.model("Contact", ContactSchema);

module.exports = Contact;