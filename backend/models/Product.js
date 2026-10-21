const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  quantity: { type: Number, required: true, default: 0 },
  expiryDate: { type: String, default: '' },
  receivedDate: { type: Date, default: Date.now }
}, { _id: true });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  netWeight: { type: String, default: '' },
  image: { type: String, default: '' },
  quantity: { type: Number, required: true, default: 0 },
  price: { type: Number, required: true },
  profit: { type: Number, required: true },
  totalCost: { type: Number, required: true },
  sold: { type: Number, required: true, default: 0 },
  reorderPoint: { type: Number, required: true, default: 10 },
  expiryDate: { type: String, default: '' },
  unit: { type: String, enum: ['pcs', 'packs'], default: 'pcs' },
  barcode: { type: String, default: '' },
  batches: [batchSchema]
});

module.exports = mongoose.model('Product', productSchema);
