const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  netWeight: { type: String, default: '' },
  image: { type: String, default: '' }, // base64 string
  quantity: { type: Number, required: true, default: 0 },
  price: { type: Number, required: true },        // Grocery store cost
  profit: { type: Number, required: true },       // Markup
  totalCost: { type: Number, required: true },    // Selling price (Price + Profit)
  sold: { type: Number, required: true, default: 0 },
  reorderPoint: { type: Number, required: true, default: 10 } // Stock alert
});

module.exports = mongoose.model('Product', productSchema);
