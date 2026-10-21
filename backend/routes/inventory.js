const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { syncProductBatches, checkAndLogExpiredBatches } = require('../utils/batchUtils');

// Get all products (automatically runs expiry audit before returning products)
router.get('/', async (req, res) => {
  try {
    await checkAndLogExpiredBatches();
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
    
    // Rule 1: Expiration date is strictly mandatory
    if (!expiryDate || String(expiryDate).trim() === '') {
      return res.status(400).json({ message: 'Expiration date is strictly required.' });
    }

    const costNum = Number(price) || 0;
    const profitNum = Number(profit) || 0;
    const totalCost = costNum + profitNum;
    const qtyNum = Number(quantity) || 0;
    
    const batches = qtyNum > 0 ? [{
      quantity: qtyNum,
      expiryDate: String(expiryDate).trim(),
      price: costNum,
      profit: profitNum,
      totalCost: totalCost,
      receivedDate: new Date(),
      isExpiredLogged: false
    }] : [];

    const product = new Product({
      name,
      category,
      netWeight: netWeight || '',
      image: image || '',
      quantity: qtyNum,
      price: costNum,
      profit: profitNum,
      totalCost,
      reorderPoint: Number(reorderPoint) || 10,
      expiryDate: String(expiryDate).trim(),
      unit: unit || 'pcs',
      barcode: barcode || '',
      batches
    });
    
    syncProductBatches(product);
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Restock product (records new batch with its own cost, markup, and expiry date)
router.post('/restock', async (req, res) => {
  try {
    const { _id, productId, name, category, netWeight, image, quantity, price, profit, reorderPoint, expiryDate, unit, barcode } = req.body;
    
    // Rule 1: Expiration date is strictly mandatory when receiving/restocking items
    if (!expiryDate || String(expiryDate).trim() === '') {
      return res.status(400).json({ message: 'Expiration date is strictly required when receiving/restocking items.' });
    }

    const costNum = Number(price) || 0;
    const profitNum = Number(profit) || 0;
    const totalCost = costNum + profitNum;
    const qtyNum = Number(quantity) || 0;

    if (qtyNum <= 0) {
      return res.status(400).json({ message: 'Restock quantity must be greater than zero.' });
    }

    // Match existing product by _id, or by name + netWeight
    let existingProduct = null;
    if (_id || productId) {
      existingProduct = await Product.findById(_id || productId);
    }
    if (!existingProduct && name) {
      existingProduct = await Product.findOne({ 
        name: name.trim(), 
        ...(netWeight ? { netWeight: netWeight.trim() } : {}) 
      });
    }

    if (existingProduct) {
      if (!existingProduct.batches || existingProduct.batches.length === 0) {
        if (existingProduct.quantity > 0) {
          existingProduct.batches = [{
            quantity: existingProduct.quantity,
            expiryDate: existingProduct.expiryDate || '',
            price: Number(existingProduct.price) || 0,
            profit: Number(existingProduct.profit) || 0,
            totalCost: Number(existingProduct.totalCost) || (Number(existingProduct.price) || 0) + (Number(existingProduct.profit) || 0),
            receivedDate: new Date(),
            isExpiredLogged: false
          }];
        } else {
          existingProduct.batches = [];
        }
      }

      // Rule 3: Record new batch/lot entry with its own cost, markup, and expiry date
      existingProduct.batches.push({
        quantity: qtyNum,
        expiryDate: String(expiryDate).trim(),
        price: costNum,
        profit: profitNum,
        totalCost: totalCost,
        receivedDate: new Date(),
        isExpiredLogged: false
      });

      if (category) existingProduct.category = category;
      if (reorderPoint !== undefined) existingProduct.reorderPoint = Number(reorderPoint);
      if (unit !== undefined) existingProduct.unit = unit;
      if (barcode !== undefined && barcode !== '') existingProduct.barcode = barcode;
      if (netWeight !== undefined) existingProduct.netWeight = netWeight;
      if (image !== undefined && image !== '') existingProduct.image = image;

      syncProductBatches(existingProduct);
      await existingProduct.save();
      return res.status(200).json(existingProduct);
    } else {
      // Create new product if it did not exist before
      const batches = [{
        quantity: qtyNum,
        expiryDate: String(expiryDate).trim(),
        price: costNum,
        profit: profitNum,
        totalCost: totalCost,
        receivedDate: new Date(),
        isExpiredLogged: false
      }];

      const product = new Product({
        name,
        category,
        netWeight: netWeight || '',
        image: image || '',
        quantity: qtyNum,
        price: costNum,
        profit: profitNum,
        totalCost,
        reorderPoint: Number(reorderPoint) || 10,
        expiryDate: String(expiryDate).trim(),
        unit: unit || 'pcs',
        barcode: barcode || '',
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
