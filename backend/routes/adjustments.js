const express = require('express');
const router = express.Router();
const StockAdjustment = require('../models/StockAdjustment');
const Product = require('../models/Product');

// Get all adjustments
router.get('/', async (req, res) => {
  try {
    const adjustments = await StockAdjustment.find().sort({ date: -1 });
    res.json(adjustments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new adjustment
router.post('/', async (req, res) => {
  try {
    const { productId, quantity, reason, notes } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.quantity < quantity) {
      return res.status(400).json({ message: 'Not enough stock to adjust' });
    }

    // Calculate loss cost
    const lossCost = product.totalCost ? (product.totalCost * quantity) : (product.price * quantity);

    // Create log
    const adjustment = new StockAdjustment({
      productId: product._id,
      productName: product.name,
      quantity,
      reason,
      notes,
      lossCost
    });

    // Deduct stock
    product.quantity -= quantity;

    await adjustment.save();
    await product.save();

    res.status(201).json(adjustment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
