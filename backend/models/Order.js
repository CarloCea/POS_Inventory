const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      name: String,
      quantity: Number,
      price: Number,      // Cost
      profit: Number,     // Markup per unit
      totalCost: Number,  // Selling price per unit
      subtotal: Number    // totalCost * quantity
    }
  ],
  totalSales: { type: Number, required: true },
  totalProfit: { type: Number, required: true },
  cashier: { type: String, default: 'Unknown' },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
