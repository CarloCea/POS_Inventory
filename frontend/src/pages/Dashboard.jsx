import React, { useEffect, useState } from 'react';
import { getDashboardStats, addProduct, restockProduct } from '../api';
import { TrendingUp, AlertTriangle, DollarSign, Plus, Package, X, ShoppingCart, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, } from 'recharts';
import { toast } from '../context/ToastContext';
import { modal } from '../context/ModalContext';


const Dashboard = ({ inventory = [], fetchInventory }) => {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalProfit: 0,
    totalLoss: 0,
    lowStockItems: 0,
    topSellingProducts: [],
    chartData: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const fetchStats = async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    const onSync = () => fetchStats();
    window.addEventListener('focus', onSync);
    window.addEventListener('inventoryUpdated', onSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onSync);
      window.removeEventListener('inventoryUpdated', onSync);
    };
  }, []);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('add');
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    netWeight: '',
    image: '',
    quantity: 0,
    price: 0,
    profit: 0,
    reorderPoint: 10
  });

  const categories = ['All', ...new Set(inventory.map(item => item.category))];
  const [profitType, setProfitType] = useState('fixed'); // 'fixed' (₱) or 'percent' (%)
  const [profitPercent, setProfitPercent] = useState('');

  const handleProfitTypeChange = (newType) => {
    setProfitType(newType);
    const costPrice = Number(formData.price) || 0;
    if (newType === 'percent') {
      if (costPrice > 0) {
        const pct = ((Number(formData.profit) || 0) / costPrice) * 100;
        setProfitPercent(pct ? parseFloat(pct.toFixed(2)).toString() : '');
      } else {
        setProfitPercent('');
      }
    }
  };

  const handlePriceChange = (val) => {
    const cost = val === '' ? '' : (parseFloat(val) || 0);
    let newProfit = formData.profit;
    if (profitType === 'percent' && profitPercent !== '' && cost !== '') {
      const pct = parseFloat(profitPercent) || 0;
      newProfit = parseFloat(((cost * pct) / 100).toFixed(2));
    }
    setFormData(prev => ({ ...prev, price: cost, profit: newProfit }));
  };

  const handleProfitFixedChange = (val) => {
    const profitVal = val === '' ? '' : (parseFloat(val) || 0);
    setFormData(prev => ({ ...prev, profit: profitVal }));
    const cost = Number(formData.price) || 0;
    if (cost > 0 && profitVal !== '') {
      setProfitPercent(parseFloat(((profitVal / cost) * 100).toFixed(2)).toString());
    } else if (profitVal === '') {
      setProfitPercent('');
    }
  };

  const handleProfitPercentChange = (val) => {
    setProfitPercent(val);
    const pct = parseFloat(val) || 0;
    const cost = Number(formData.price) || 0;
    const computedProfit = parseFloat(((cost * pct) / 100).toFixed(2));
    setFormData(prev => ({ ...prev, profit: computedProfit }));
  };

  const totalCostCalc = (Number(formData.price) || 0) + (Number(formData.profit) || 0);

  const handleOpenModal = (type) => {
    setModalType(type);
    setProfitType('fixed');
    setProfitPercent('');
    setFormData({
      _id: '',
      name: '',
      category: '',
      netWeight: '',
      image: '',
      quantity: '',
      price: '',
      profit: '',
      reorderPoint: 10,
      expiryDate: '',
      unit: 'pcs',
      barcode: ''
    });
    setShowModal(true);
  };

  const handleRestockProductSelect = (selectedId) => {
    const prod = inventory.find(p => p._id === selectedId);
    if (!prod) return;
    setProfitType('fixed');
    setProfitPercent('');
    const activeBatches = (prod.batches || []).filter(b => (Number(b.quantity) || 0) > 0);
    setFormData({
      _id: prod._id,
      name: prod.name,
      barcode: prod.barcode || '',
      category: prod.category || '',
      netWeight: prod.netWeight || '',
      image: prod.image || '',
      unit: prod.unit || 'pcs',
      reorderPoint: prod.reorderPoint !== undefined ? prod.reorderPoint : 10,
      batches: activeBatches,
      selectedBatchId: 'new',
      quantity: '',
      price: '',
      profit: '',
      expiryDate: ''
    });
  };

  const handleBatchChangeInRestock = (batchId) => {
    setFormData(prev => {
      if (batchId === 'new' || !batchId) {
        return {
          ...prev,
          selectedBatchId: 'new',
          quantity: '',
          price: '',
          profit: '',
          expiryDate: ''
        };
      }
      const found = (prev.batches || []).find(b => (b._id && b._id.toString() === batchId.toString()) || b._id === batchId);
      if (found) {
        const cost = Number(found.price) || 0;
        const prof = Number(found.profit) || 0;
        if (cost > 0) {
          setProfitPercent(parseFloat(((prof / cost) * 100).toFixed(2)).toString());
        }
        return {
          ...prev,
          selectedBatchId: batchId,
          quantity: '',
          price: found.price,
          profit: found.profit,
          expiryDate: found.expiryDate || ''
        };
      }
      return { ...prev, selectedBatchId: batchId };
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.expiryDate || String(formData.expiryDate).trim() === '') {
      toast.error('Expiration date is strictly required.');
      return;
    }
    try {
      const payload = {
        ...formData,
        quantity: Number(formData.quantity) || 0,
        price: Number(formData.price) || 0,
        profit: Number(formData.profit) || 0,
        reorderPoint: Number(formData.reorderPoint) || 10,
        selectedBatchId: formData.selectedBatchId || undefined,
        batchId: formData.selectedBatchId || undefined
      };
      if (modalType === 'add') {
        await addProduct(payload);
      } else if (modalType === 'restock') {
        await restockProduct(payload);
      }
      await fetchStats();
      if (fetchInventory) await fetchInventory();
      window.dispatchEvent(new Event('inventoryUpdated'));
      handleCloseModal();
      const msg = modalType === 'add' ? 'Product added successfully!' : 'Product restocked successfully!';
      const title = modalType === 'add' ? 'Product Added' : 'Product Restocked';
      await modal.success(msg, title);
    } catch (err) {
      console.error("Operation failed", err.response?.data || err);
      await modal.error(`Failed to save data. Error: ${err.response?.data?.message || err.message}`, 'Save Failed');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full py-20 text-gray-500">Loading Dashboard...</div>;
  }

  const currentMonthData = stats.chartData.filter(d => {
    const date = new Date(d.date);
    return !isNaN(date.getTime()) && date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
  });

  const monthlySales = currentMonthData.reduce((sum, day) => sum + (day.sales || 0), 0);
  const monthlyProfit = currentMonthData.reduce((sum, day) => sum + (day.profit || 0), 0);
  const monthlyLoss = currentMonthData.reduce((sum, day) => sum + (day.loss || 0), 0);

  const currentMonthString = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
        <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{currentMonthString}</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">Monthly Sales</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">₱{monthlySales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">Monthly Profit</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">₱{monthlyProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="p-4 bg-green-50 border border-green-100 rounded-xl">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">Low Stock Items</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.lowStockItems}</p>
            </div>
            <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">Monthly Loss</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">₱{(monthlyLoss || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h3>
          <div className="flex flex-col space-y-4">
            <button
              onClick={() => handleOpenModal('add')}
              className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 transition-colors w-full font-medium"
            >
              <Plus className="w-5 h-5" />
              <span>Add New Item</span>
            </button>
            <button
              onClick={() => handleOpenModal('restock')}
              className="flex items-center justify-center space-x-2 bg-orange-50 text-orange-700 px-4 py-3 rounded-xl hover:bg-orange-100 transition-colors w-full font-medium"
            >
              <Package className="w-5 h-5" />
              <span>Restock Item</span>
            </button>
            <button
              onClick={() => {
                const { protocol, hostname, origin } = window.location;
                if (hostname === 'localhost' || hostname === '127.0.0.1') {
                  window.open(`${protocol}//${hostname}:3001`, '_blank');
                } else {
                  window.open(`${origin}/pos`, '_blank');
                }
              }}
              className="flex items-center justify-center space-x-2 bg-green-50 text-green-700 px-4 py-3 rounded-xl hover:bg-green-100 transition-colors w-full font-medium"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Open POS</span>
            </button>
          </div>
        </div>

        {/* Line Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:col-span-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
              <span>Sales Overview for</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-gray-900 focus:border-gray-900 p-1.5 ml-2 font-medium outline-none"
              >
                {months.map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-gray-900 focus:border-gray-900 p-1.5 ml-2 font-medium outline-none"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </h3>
          </div>
          <div className="h-80">
            {stats.chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400">No sales data available yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(() => {
                  const weeklyData = [
                    { name: 'Week 1', sales: 0, profit: 0 },
                    { name: 'Week 2', sales: 0, profit: 0 },
                    { name: 'Week 3', sales: 0, profit: 0 },
                    { name: 'Week 4', sales: 0, profit: 0 }
                  ];

                  currentMonthData.forEach(d => {
                    const day = new Date(d.date).getDate();
                    let weekIndex = 0;
                    if (day > 7 && day <= 14) weekIndex = 1;
                    else if (day > 14 && day <= 21) weekIndex = 2;
                    else if (day > 21) weekIndex = 3;

                    weeklyData[weekIndex].sales += d.sales;
                    weeklyData[weekIndex].profit += d.profit;
                  });
                  return weeklyData;
                })()} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis
                    allowDecimals={false}
                    domain={[0, dataMax => Math.max(Math.ceil(dataMax / 10) * 10, 10)]}
                    tickFormatter={(val) => `₱${val.toLocaleString()}`}
                  />
                  <RechartsTooltip formatter={(value) => `₱${value.toLocaleString()}`} cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }} />
                  <Legend iconType="circle" />
                  <Bar dataKey="sales" name="Sales" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="Profit" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
              <h3 className="text-lg font-bold text-gray-800">
                {modalType === 'add' && 'Add New Item'}
                {modalType === 'restock' && 'Restock Item'}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div className="flex flex-col items-center mb-2">
                <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden mb-3 relative group">
                  {formData.image ? (
                    <>
                      <img src={formData.image} alt="Item Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setFormData({ ...formData, image: '' });
                            toast.info('Image removed');
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-lg transition-transform transform hover:scale-110 flex items-center justify-center"
                          title="Remove image"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 w-48">
                  <label className="cursor-pointer bg-blue-50 text-blue-600 hover:bg-blue-100 py-2 rounded-md text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                    <span>Upload</span>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                  <label className="cursor-pointer bg-blue-50 text-blue-600 hover:bg-blue-100 py-2 rounded-md text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    <span>Camera</span>
                    <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
                  </label>
                </div>
              </div>
              {modalType === 'restock' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Product to Restock *</label>
                    <select
                      value={formData._id || ''}
                      onChange={e => handleRestockProductSelect(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      required
                    >
                      <option value="">-- Choose an Existing Product --</option>
                      {inventory.map(item => (
                        <option key={item._id} value={item._id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {formData._id && formData.batches && formData.batches.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Batch to Restock</label>
                      <select
                        value={formData.selectedBatchId || 'new'}
                        onChange={e => handleBatchChangeInRestock(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      >
                        <option value="new">+ Create New Batch</option>
                        {formData.batches.map((batch, idx) => (
                          <option key={batch._id || idx} value={batch._id || idx}>
                            Batch #{idx + 1} — Current: {batch.quantity} {formData.unit || 'pcs'} {batch.expiryDate ? `(Exp: ${new Date(batch.expiryDate).toLocaleDateString()})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    list="dashboard-inventory-names"
                  />
                  <datalist id="dashboard-inventory-names">
                    {[...new Set(inventory.map(i => i.name))].map(name => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Barcode / ID</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Scan or type"
                    className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                    list="dashboard-inventory-categories"
                  />
                  <datalist id="dashboard-inventory-categories">
                    {categories.filter(c => c !== 'All').map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Net Wt.</label>
                  <input
                    type="text"
                    value={formData.netWeight}
                    onChange={e => setFormData({ ...formData, netWeight: e.target.value })}
                    placeholder="e.g. 500g, 1kg"
                    className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    value={formData.unit || 'pcs'}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="packs">Packs (packs)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {modalType === 'restock' ? 'Quantity to Add *' : 'Quantity *'}
                  </label>
                  <input
                    type="number"
                    required
                    min={modalType === 'restock' ? "1" : "0"}
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: e.target.value === '' ? '' : Number(e.target.value) })}
                    placeholder="Enter quantity"
                    className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Alert (Threshold)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.reorderPoint}
                    onChange={e => setFormData({ ...formData, reorderPoint: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {modalType === 'restock' ? 'New Batch Expiry Date *' : 'Expiry Date *'}
                </label>
                <input
                  type="date"
                  required
                  value={formData.expiryDate}
                  onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (Cost) ₱</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={e => handlePriceChange(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Profit (Markup)</label>
                  <div className="relative flex rounded-md shadow-sm">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm font-medium">
                      {profitType === 'fixed' ? '₱' : '%'}
                    </span>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={profitType === 'fixed' ? formData.profit : profitPercent}
                      onChange={e => profitType === 'fixed' ? handleProfitFixedChange(e.target.value) : handleProfitPercentChange(e.target.value)}
                      className="flex-1 min-w-0 block w-full px-3 py-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={profitType === 'fixed' ? "0.00" : "20"}
                    />
                    <select
                      value={profitType}
                      onChange={e => handleProfitTypeChange(e.target.value)}
                      className="w-16 px-1.5 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-700 text-xs font-semibold hover:bg-gray-100 focus:ring-blue-500 focus:border-blue-500 cursor-pointer text-center"
                    >
                      <option value="fixed">₱</option>
                      <option value="percent">%</option>
                    </select>
                  </div>
                  {profitType === 'percent' && (
                    <p className="text-xs text-gray-500 mt-1">
                      = <span className="font-semibold text-gray-800">₱{(Number(formData.profit) || 0).toFixed(2)}</span> profit
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-md mt-4 flex justify-between items-center">
                <span className="text-sm font-semibold text-blue-800">Total Selling Price:</span>
                <span className="text-xl font-bold text-blue-600">₱{totalCostCalc.toFixed(2)}</span>
              </div>

              <div className="pt-4 flex space-x-3 shrink-0">
                <button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
