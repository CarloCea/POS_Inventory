const mongoose = require('mongoose');

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
  reorderPoint: { type: Number, required: true, default: 10 } 
});

module.exports = mongoose.model('Product', productSchema);
