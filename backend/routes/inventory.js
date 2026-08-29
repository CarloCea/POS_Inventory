const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ _id: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add new product
router.post('/', async (req, res) => {
  try {
    const { name, category, netWeight, image, quantity, price, profit, reorderPoint, expiryDate, unit, barcode } = req.body;
    const totalCost = Number(price) + Number(profit);
    
    const product = new Product({
      name,
      category,
      netWeight,
      image,
      quantity,
      price,
      profit,
      totalCost,
      reorderPoint,
      expiryDate,
      unit,
      barcode
    });
    
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Restock product
router.post('/restock', async (req, res) => {
  try {
    const { name, category, netWeight, image, quantity, price, profit, reorderPoint, expiryDate, unit, barcode } = req.body;
    const totalCost = Number(price) + Number(profit);
    const existingProduct = await Product.findOne({ name: name, price: Number(price) });

    if (existingProduct) {
      existingProduct.quantity += Number(quantity);
      existingProduct.profit = profit; 
      existingProduct.totalCost = totalCost;
      existingProduct.reorderPoint = reorderPoint;
      if (expiryDate !== undefined) existingProduct.expiryDate = expiryDate;
      if (unit !== undefined) existingProduct.unit = unit;
      if (barcode !== undefined) existingProduct.barcode = barcode;
      if (netWeight !== undefined) existingProduct.netWeight = netWeight;
      if (image !== undefined) existingProduct.image = image;
      await existingProduct.save();
      return res.status(200).json(existingProduct);
    } else {
      const product = new Product({
        name,
        category,
        netWeight,
        image,
        quantity,
        price,
        profit,
        totalCost,
        reorderPoint,
        expiryDate,
        unit,
        barcode
      });
      await product.save();
      return res.status(201).json(product);
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update product
router.put('/:id', async (req, res) => {
  try {
    const { price, profit } = req.body;
    const updateData = { ...req.body };
    if (price !== undefined && profit !== undefined) {
      updateData.totalCost = Number(price) + Number(profit);
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete product
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
