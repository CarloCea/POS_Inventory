const mongoose = require('mongoose');

const stockAdjustmentSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  reason: {
    type: String,
    enum: ['Damage', 'Loss', 'Expired', 'Theft', 'Other'],
    required: true
  },
  notes: { type: String },
  lossCost: { type: Number, default: 0 },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StockAdjustment', stockAdjustmentSchema);
