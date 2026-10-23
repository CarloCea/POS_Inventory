const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { syncProductBatches, checkAndLogExpiredBatches } = require('../utils/batchUtils');

// Image URLs we generate for list responses must never be saved back as the product image
const isSelfImageUrl = (value) => typeof value === 'string' && /\/api\/inventory\/[a-f0-9]{24}\/image/i.test(value);

// Never let a generated image URL be written back over the real stored image (POST/PUT/restock)
router.use((req, res, next) => {
  if (req.body && isSelfImageUrl(req.body.image)) {
    delete req.body.image;
  }
  next();
});

// Get all products. Base64 images are excluded from the list (they can be several MB each)
// and are served separately and cached through GET /:id/image.
router.get('/', async (req, res) => {
  try {
    const base = `${req.protocol}://${req.get('host')}`;
    const [products, imageMeta] = await Promise.all([
      Product.find().select('-image').sort({ _id: -1 }).lean(),
      // Only the length and a non-data URL are pulled here, never the base64 payload
      Product.aggregate([
        {
          $project: {
            len: { $strLenCP: { $ifNull: ['$image', ''] } },
            isData: { $eq: [{ $substrCP: [{ $ifNull: ['$image', ''] }, 0, 5] }, 'data:'] },
            url: { $cond: [{ $eq: [{ $substrCP: [{ $ifNull: ['$image', ''] }, 0, 5] }, 'data:'] }, '', { $ifNull: ['$image', ''] }] }
          }
        }
      ])
    ]);

    const metaById = new Map(imageMeta.map(m => [String(m._id), m]));
    const result = products.map(p => {
      const meta = metaById.get(String(p._id));
      let image = '';
      if (meta && meta.len > 0) {
        image = meta.isData ? `${base}/api/inventory/${p._id}/image?v=${meta.len}` : meta.url;
      }
      return { ...p, image };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Serve a product image as a real, browser-cacheable image
router.get('/:id/image', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).select('image').lean();
    if (!product || !product.image) return res.status(404).end();
    if (!product.image.startsWith('data:')) {
      return res.redirect(product.image);
    }
    const commaIdx = product.image.indexOf(',');
    if (commaIdx === -1) return res.status(404).end();
    const metaPart = product.image.slice(5, commaIdx);
    const mime = metaPart.split(';')[0] || 'image/jpeg';
    const base64Data = product.image.slice(commaIdx + 1);
    res.set('Content-Type', mime);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(Buffer.from(base64Data, 'base64'));
  } catch (err) {
    res.status(404).end();
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

// Restock product (records new batch with its own cost, markup, and expiry date, or restocks existing batch)
router.post('/restock', async (req, res) => {
  try {
    const { _id, productId, name, category, netWeight, image, quantity, price, profit, reorderPoint, expiryDate, unit, barcode, batchId, selectedBatchId } = req.body;
    const targetBatchId = batchId || selectedBatchId;
    
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

      // Check if restocking an existing batch
      let existingBatch = null;
      if (targetBatchId && targetBatchId !== 'new') {
        existingBatch = existingProduct.batches.find(b => b._id && b._id.toString() === targetBatchId.toString());
      }

      if (existingBatch) {
        existingBatch.quantity = (Number(existingBatch.quantity) || 0) + qtyNum;
        if (costNum > 0) existingBatch.price = costNum;
        if (profitNum > 0) existingBatch.profit = profitNum;
        existingBatch.totalCost = (Number(existingBatch.price) || 0) + (Number(existingBatch.profit) || 0);
        if (expiryDate) existingBatch.expiryDate = String(expiryDate).trim();
      } else {
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
      }

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

// Update product or specific batch
router.put('/:id', async (req, res) => {
  try {
    const { price, profit, quantity, expiryDate, batchId, selectedBatchId } = req.body;
    const targetBatchId = batchId || selectedBatchId;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const updateData = { ...req.body };
    delete updateData.batchId;
    delete updateData.selectedBatchId;

    if (price !== undefined && profit !== undefined) {
      updateData.totalCost = Number(price) + Number(profit);
    }

    Object.assign(product, updateData);

    // If editing a specific batch
    if (targetBatchId && product.batches && product.batches.length > 0) {
      const batch = product.batches.find(b => b._id && b._id.toString() === targetBatchId.toString());
      if (batch) {
        if (quantity !== undefined && quantity !== '') batch.quantity = Number(quantity);
        if (price !== undefined && price !== '') batch.price = Number(price);
        if (profit !== undefined && profit !== '') batch.profit = Number(profit);
        if (price !== undefined || profit !== undefined) {
          batch.totalCost = (Number(batch.price) || 0) + (Number(batch.profit) || 0);
        }
        if (expiryDate !== undefined && expiryDate !== '') batch.expiryDate = String(expiryDate).trim();
      }
    }

    syncProductBatches(product);
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
