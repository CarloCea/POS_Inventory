// Synchronize batches array and compute total quantity and earliest expiryDate
function syncProductBatches(product) {
  if (!product.batches || product.batches.length === 0) {
    if (product.quantity > 0) {
      product.batches = [{
        quantity: Number(product.quantity) || 0,
        expiryDate: product.expiryDate || '',
        receivedDate: new Date()
      }];
    } else {
      product.batches = [];
    }
  }

  // Calculate total quantity from batches
  product.quantity = product.batches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);

  // Find earliest expiry date among active batches (quantity > 0 and expiryDate not empty)
  const activeBatches = product.batches.filter(b => b.quantity > 0 && b.expiryDate);
  if (activeBatches.length > 0) {
    activeBatches.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    product.expiryDate = activeBatches[0].expiryDate;
  }
  return product;
}

// Deduct quantity using FIFO (First-In, First-Out: earliest expiry first)
function deductFifo(product, quantityToDeduct) {
  syncProductBatches(product);

  let remainingToDeduct = Number(quantityToDeduct);

  // Sort batches: active batches with expiry dates earliest first, then batches without expiry dates
  const activeBatches = product.batches.filter(b => b.quantity > 0);
  activeBatches.sort((a, b) => {
    if (a.expiryDate && b.expiryDate) {
      return new Date(a.expiryDate) - new Date(b.expiryDate);
    }
    if (a.expiryDate) return -1;
    if (b.expiryDate) return 1;
    return new Date(a.receivedDate) - new Date(b.receivedDate);
  });

  for (let batch of activeBatches) {
    if (remainingToDeduct <= 0) break;

    const deductAmount = Math.min(batch.quantity, remainingToDeduct);
    batch.quantity -= deductAmount;
    remainingToDeduct -= deductAmount;
  }

  // Update total product quantity & earliest expiryDate
  product.quantity = product.batches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
  const remainingActiveWithExpiry = product.batches.filter(b => b.quantity > 0 && b.expiryDate);
  if (remainingActiveWithExpiry.length > 0) {
    remainingActiveWithExpiry.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    product.expiryDate = remainingActiveWithExpiry[0].expiryDate;
  }

  return product;
}

module.exports = {
  syncProductBatches,
  deductFifo
};
