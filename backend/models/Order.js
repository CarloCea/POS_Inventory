const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      name: String,
      quantity: Number,
      price: Number,      
      profit: Number,     
      totalCost: Number,  
      subtotal: Number    
    }
  ],
  totalSales: { type: Number, required: true },
  totalProfit: { type: Number, required: true },
  cashier: { type: String, default: 'Unknown' },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
