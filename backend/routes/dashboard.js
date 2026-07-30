const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');

router.get('/stats', async (req, res) => {
  try {
    const products = await Product.find();
    const orders = await Order.find();

    const lowStockItems = products.filter(p => p.quantity <= p.reorderPoint).length;
    const totalSales = orders.reduce((sum, order) => sum + (order.totalSales || 0), 0);
    const totalProfit = orders.reduce((sum, order) => sum + (order.totalProfit || 0), 0);

    // Group sales by product for Pie Chart
    const salesByProduct = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        if (!salesByProduct[item.name]) salesByProduct[item.name] = 0;
        salesByProduct[item.name] += item.quantity;
      });
    });

    const topSellingProducts = Object.keys(salesByProduct)
      .map(name => ({ name, value: salesByProduct[name] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const salesOverTime = {};
    orders.forEach(order => {
      const dateStr = order.date.toISOString().split('T')[0]; // YYYY-MM-DD
      if (!salesOverTime[dateStr]) salesOverTime[dateStr] = { date: dateStr, sales: 0, profit: 0 };
      salesOverTime[dateStr].sales += (order.totalSales || 0);
      salesOverTime[dateStr].profit += (order.totalProfit || 0);
    });

    const chartData = Object.values(salesOverTime).sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      totalSales,
      totalProfit,
      lowStockItems,
      topSellingProducts,
      chartData
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
