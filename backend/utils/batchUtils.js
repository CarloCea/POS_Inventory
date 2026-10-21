const StockAdjustment = require('../models/StockAdjustment');
const Product = require('../models/Product');

// Synchronize batches array and compute total quantity, earliest expiryDate, and active selling price
function syncProductBatches(product) {
  if (!product.batches || product.batches.length === 0) {
    if (product.quantity > 0) {
      product.batches = [{
        quantity: Number(product.quantity) || 0,
        expiryDate: product.expiryDate || '',
        price: Number(product.price) || 0,
        profit: Number(product.profit) || 0,
        totalCost: Number(product.totalCost) || ((Number(product.price) || 0) + (Number(product.profit) || 0)),
        receivedDate: new Date()
      }];
    } else {
      product.batches = [];
    }
  }

  // Calculate total sellable quantity from batches
  product.quantity = product.batches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);

  // Sort active batches using FEFO (First-Expired First-Out, fallback to FIFO by receivedDate)
  const activeBatches = product.batches.filter(b => b.quantity > 0);
  activeBatches.sort((a, b) => {
    if (a.expiryDate && b.expiryDate) {
      const diff = new Date(a.expiryDate) - new Date(b.expiryDate);
      if (diff !== 0) return diff;
      return new Date(a.receivedDate || 0) - new Date(b.receivedDate || 0);
    }
    if (a.expiryDate) return -1;
    if (b.expiryDate) return 1;
    return new Date(a.receivedDate || 0) - new Date(b.receivedDate || 0);
  });

  if (activeBatches.length > 0) {
    product.expiryDate = activeBatches[0].expiryDate || product.expiryDate;
    // Set active product prices to the current batch being sold
    if (activeBatches[0].price !== undefined && activeBatches[0].price !== null) {
      product.price = Number(activeBatches[0].price);
      product.profit = Number(activeBatches[0].profit);
      product.totalCost = Number(activeBatches[0].totalCost) || (product.price + product.profit);
    }
  }

  return product;
}

// Deduct quantity using FEFO (First-Expired, First-Out, fallback to FIFO)
function deductFifo(product, quantityToDeduct) {
  syncProductBatches(product);

  let remainingToDeduct = Number(quantityToDeduct);

  // Sort active batches: earliest expiry first (FEFO), fallback to oldest received date (FIFO)
  const activeBatches = product.batches.filter(b => b.quantity > 0);
  activeBatches.sort((a, b) => {
    if (a.expiryDate && b.expiryDate) {
      const diff = new Date(a.expiryDate) - new Date(b.expiryDate);
      if (diff !== 0) return diff;
      return new Date(a.receivedDate || 0) - new Date(b.receivedDate || 0);
    }
    if (a.expiryDate) return -1;
    if (b.expiryDate) return 1;
    return new Date(a.receivedDate || 0) - new Date(b.receivedDate || 0);
  });

  const deductions = [];
  for (let batch of activeBatches) {
    if (remainingToDeduct <= 0) break;

    const deductAmount = Math.min(batch.quantity, remainingToDeduct);
    batch.quantity -= deductAmount;
    remainingToDeduct -= deductAmount;
    deductions.push({
      batchId: batch._id ? batch._id.toString() : '',
      quantity: deductAmount,
      price: Number(batch.price) || 0,
      profit: Number(batch.profit) || 0,
      totalCost: Number(batch.totalCost) || ((Number(batch.price) || 0) + (Number(batch.profit) || 0)),
      expiryDate: batch.expiryDate
    });
  }

  // Re-sync product quantity, earliest expiry, and active price to next batch
  syncProductBatches(product);
  return { product, deductions };
}

// Automated background check that marks expired batches as non-sellable and logs to StockAdjustment
async function checkAndLogExpiredBatches() {
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const products = await Product.find({ 'batches.quantity': { $gt: 0 } });

    for (let product of products) {
      let modified = false;
      if (!product.batches || product.batches.length === 0) continue;

      for (let batch of product.batches) {
        if (batch.quantity > 0 && batch.expiryDate && !batch.isExpiredLogged) {
          const expDate = new Date(batch.expiryDate);
          if (expDate < now) {
            const quantityLost = batch.quantity;
            batch.quantity = 0; // Mark non-sellable
            batch.isExpiredLogged = true;

            const unitCost = Number(batch.price) || Number(product.price) || 0;
            const logEntry = new StockAdjustment({
              productId: product._id,
              productName: product.name,
              quantity: quantityLost,
              reason: 'Expired',
              type: 'EXPIRED',
              batchId: batch._id ? batch._id.toString() : '',
              cost: unitCost * quantityLost,
              date: new Date(),
              notes: `Automated expiry: ${quantityLost} units expired on ${batch.expiryDate} (Batch ID: ${batch._id})`
            });
            await logEntry.save();
            modified = true;
          }
        }
      }

      if (modified) {
        syncProductBatches(product);
        await product.save();
      }
    }
  } catch (err) {
    console.error('Error in automated expiration check:', err);
  }
}

module.exports = {
  syncProductBatches,
  deductFifo,
  checkAndLogExpiredBatches
};
