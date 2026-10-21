const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { syncProductBatches } = require('../utils/batchUtils');

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
    
    const batches = Number(quantity) > 0 ? [{
      quantity: Number(quantity),
      expiryDate: expiryDate || '',
      receivedDate: new Date()
    }] : [];

    const product = new Product({
      name,
      category,
      netWeight,
      image,
      quantity: Number(quantity) || 0,
      price: Number(price),
      profit: Number(profit),
      totalCost,
      reorderPoint: Number(reorderPoint) || 10,
      expiryDate: expiryDate || '',
      unit,
      barcode,
      batches
    });
    
    syncProductBatches(product);
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
      if (!existingProduct.batches || existingProduct.batches.length === 0) {
        if (existingProduct.quantity > 0) {
          existingProduct.batches = [{
            quantity: existingProduct.quantity,
            expiryDate: existingProduct.expiryDate || '',
            receivedDate: new Date()
          }];
        } else {
          existingProduct.batches = [];
        }
      }

      // Add the new batch with its unique expiration date
      existingProduct.batches.push({
        quantity: Number(quantity),
        expiryDate: expiryDate || '',
        receivedDate: new Date()
      });

      existingProduct.profit = Number(profit); 
      existingProduct.totalCost = totalCost;
      if (reorderPoint !== undefined) existingProduct.reorderPoint = Number(reorderPoint);
      if (unit !== undefined) existingProduct.unit = unit;
      if (barcode !== undefined) existingProduct.barcode = barcode;
      if (netWeight !== undefined) existingProduct.netWeight = netWeight;
      if (image !== undefined && image !== '') existingProduct.image = image;

      syncProductBatches(existingProduct);
      await existingProduct.save();
      return res.status(200).json(existingProduct);
    } else {
      const batches = Number(quantity) > 0 ? [{
        quantity: Number(quantity),
        expiryDate: expiryDate || '',
        receivedDate: new Date()
      }] : [];

      const product = new Product({
        name,
        category,
        netWeight,
        image,
        quantity: Number(quantity) || 0,
        price: Number(price),
        profit: Number(profit),
        totalCost,
        reorderPoint: Number(reorderPoint) || 10,
        expiryDate: expiryDate || '',
        unit,
        barcode,
        batches
      });

      syncProductBatches(product);
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

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    Object.assign(product, updateData);

    // Keep batches in sync
    if (!req.body.batches) {
      if (!product.batches || product.batches.length <= 1) {
        product.batches = product.quantity > 0 ? [{
          quantity: product.quantity,
          expiryDate: product.expiryDate || '',
          receivedDate: new Date()
        }] : [];
      } else {
        syncProductBatches(product);
      }
    } else {
      syncProductBatches(product);
    }

    await product.save();
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
