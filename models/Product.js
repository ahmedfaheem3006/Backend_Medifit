const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Productschema = new Schema({
  type: { type: String, required: true },
  rating: { type: String, required: true }, 
  name: { type: String, required: true },
  price: { type: Number, required: true },
  sale_percentage: { type: Number, required: false }, 
  price_after_sale: { type: Number, required: false }, 
  image: { type: String, required: true },
  description: { type: String, required: true },
  key_benefits: { type: String, required: true },
});

const Product = mongoose.model("Product", Productschema);

module.exports = Product;