// models/Order.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OrderProductSchema = new Schema({
  product: { 
    type: Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true 
  },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  price_after_sale: { type: Number },
  image: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 }
});

const ShippingInfoSchema = new Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, required: true },
  notes: { type: String }
});

const OrderSchema = new Schema({
  orderId: { 
    type: String,
    // Changed: removing required: true because we generate it in the pre-save hook
    unique: true
  },
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true
  },
  products: [OrderProductSchema],
  subtotalPrice: { 
    type: Number, 
    required: true 
  },
  discountAmount: { 
    type: Number, 
    default: 0 
  },
  shippingFee: { 
    type: Number, 
    default: 50 
  },
  totalPrice: { 
    type: Number, 
    required: true 
  },
  paymentMethod: { 
    type: String, 
    required: true,
    enum: ['Credit Card', 'PayPal', 'Apple Pay', 'Google Pay']
  },
  shippingInfo: ShippingInfoSchema,
  orderDate: { 
    type: Date, 
    default: Date.now 
  },
  processingDate: { 
    type: Date 
  },
  shippedDate: { 
    type: Date 
  },
  deliveredDate: { 
    type: Date 
  },
  status: { 
    type: String, 
    required: true,
    enum: ['Processing', 'Shipped', 'In Transit', 'Delivered', 'Cancelled'],
    default: 'Processing'
  }
});

// Generate unique order ID before saving
OrderSchema.pre('save', async function(next) {
  if (!this.orderId) {
    const date = new Date();
    const timestamp = date.getTime().toString().slice(-8);
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.orderId = `ORD-${timestamp}-${randomStr}`;
  }
  next();
});

const Order = mongoose.model('Order', OrderSchema);

module.exports = Order;