const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');

// Process POS checkout
router.post('/checkout', async (req, res) => {
  const { items, totalAmount, cashier } = req.body; // Note: totalAmount here might be used for validation, we'll recalculate
  
  if (!items || items.length === 0) {
    return res.status(400).json({ message: 'No items provided' });
  }

  try {
    let calculatedTotalSales = 0;
    let calculatedTotalProfit = 0;
    const orderItems = [];

    // Start by updating product quantities and sold counts
    for (let item of items) {
      const product = await Product.findById(item._id);
      if (!product) {
        return res.status(404).json({ message: `Product ${item.name} not found` });
      }
      if (product.quantity < item.cartQuantity) {
        return res.status(400).json({ message: `Not enough stock for ${item.name}` });
      }
      
      product.quantity -= item.cartQuantity;
      product.sold += item.cartQuantity;
      await product.save();

      const itemTotalCost = product.totalCost * item.cartQuantity;
      const itemTotalProfit = product.profit * item.cartQuantity;

      calculatedTotalSales += itemTotalCost;
      calculatedTotalProfit += itemTotalProfit;

      orderItems.push({
        productId: product._id,
        name: product.name,
        quantity: item.cartQuantity,
        price: product.price,
        profit: product.profit,
        totalCost: product.totalCost,
        subtotal: itemTotalCost
      });
    }

    // Create the order record
    const newOrder = new Order({
      items: orderItems,
      totalSales: calculatedTotalSales,
      totalProfit: calculatedTotalProfit,
      cashier: cashier || 'Unknown'
    });
    
    await newOrder.save();

    res.status(201).json({ message: 'Order processed successfully', order: newOrder });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get transaction history
router.get('/transactions', async (req, res) => {
  try {
    const orders = await Order.find().sort({ date: -1 }); // Sort by newest first
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get today's sales for a specific cashier
router.get('/sales/today', async (req, res) => {
  try {
    const { cashier } = req.query;
    if (!cashier) return res.status(400).json({ message: 'Cashier username is required' });

    // Start and end of today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const orders = await Order.find({
      cashier: cashier,
      date: { $gte: startOfToday, $lte: endOfToday }
    });

    const totalSales = orders.reduce((sum, order) => sum + (order.totalSales || 0), 0);
    res.json({ totalSales });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
