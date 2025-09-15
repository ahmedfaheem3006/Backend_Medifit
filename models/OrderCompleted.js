// models/OrderCompleted.js
const mongoose = require('mongoose');

const orderCompletedSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  products: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    image: String
  }],
  totalPrice: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['credit_card', 'paypal', 'cash_on_delivery']
  },
  shippingInfo: {
    fullName: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    zipCode: {  // تغيير من postalCode إلى zipCode
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    },
    notes: {
      type: String
    }
  },
  status: {
    type: String,
    default: 'Completed',
    enum: ['Completed']
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  completedDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('OrderCompleted', orderCompletedSchema);