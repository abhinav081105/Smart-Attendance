const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    subscription: { type: Object, required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PushSubscription', subscriptionSchema);
