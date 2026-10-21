const express = require('express');
const router = express.Router();
const StockAdjustment = require('../models/StockAdjustment');
const Product = require('../models/Product');
const { deductFifo } = require('../utils/batchUtils');

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
    const { productId, quantity, reason, notes, batchId, selectedBatchId } = req.body;
    const targetBatchId = batchId || selectedBatchId;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const qtyNum = Number(quantity);
    if (qtyNum <= 0) {
      return res.status(400).json({ message: 'Adjustment quantity must be greater than zero' });
    }

    if (product.quantity < qtyNum) {
      return res.status(400).json({ message: 'Not enough total stock to adjust' });
    }

    let cost = 0;
    let adjustedBatchId = '';

    // If specific batch is selected
    if (targetBatchId && product.batches && product.batches.length > 0) {
      const batch = product.batches.find(b => b._id && b._id.toString() === targetBatchId.toString());
      if (!batch) {
        return res.status(404).json({ message: 'Selected batch not found' });
      }
      if (batch.quantity < qtyNum) {
        return res.status(400).json({ message: `Not enough stock in selected batch (Current: ${batch.quantity})` });
      }

      batch.quantity -= qtyNum;
      const unitCost = Number(batch.price) || Number(product.price) || 0;
      cost = unitCost * qtyNum;
      adjustedBatchId = batch._id ? batch._id.toString() : targetBatchId.toString();

      const { syncProductBatches } = require('../utils/batchUtils');
      syncProductBatches(product);
    } else {
      // Auto-deduct using FEFO/FIFO across batches
      const unitCost = Number(product.price) || 0;
      cost = unitCost * qtyNum;
      deductFifo(product, qtyNum);
    }

    // Check for existing log for this product, reason and batch
    let adjustment = await StockAdjustment.findOne({ 
      productId: product._id, 
      reason,
      batchId: adjustedBatchId || ''
    });

    if (adjustment) {
      adjustment.quantity += qtyNum;
      adjustment.cost = (adjustment.cost || 0) + cost;
      adjustment.date = Date.now();
      if (notes) {
        adjustment.notes = adjustment.notes ? `${adjustment.notes} | ${notes}` : notes;
      }
    } else {
      adjustment = new StockAdjustment({
        productId: product._id,
        productName: product.name,
        quantity: qtyNum,
        reason,
        notes,
        cost,
        batchId: adjustedBatchId || ''
      });
    }

    await adjustment.save();
    await product.save();

    res.status(201).json(adjustment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
