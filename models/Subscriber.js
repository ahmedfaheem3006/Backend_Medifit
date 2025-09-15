const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SubscriberSchema = new Schema({
  email: { 
    type: String, 
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    default: null
  },
  discountUsed: {
    type: Boolean,
    default: false
  },
  subscriptionDate: { 
    type: Date, 
    default: Date.now 
  }
});

const Subscriber = mongoose.model('Subscriber', SubscriberSchema);

module.exports = Subscriber;