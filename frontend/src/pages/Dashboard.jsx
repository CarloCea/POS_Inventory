import React, { useEffect, useState } from 'react';
import { getDashboardStats, addProduct, restockProduct } from '../api';
import { TrendingUp, AlertTriangle, DollarSign, Plus, Package, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, } from 'recharts';


const Dashboard = ({ inventory = [] }) => {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalProfit: 0,
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
  const totalCostCalc = (Number(formData.price) || 0) + (Number(formData.profit) || 0);

  const handleOpenModal = (type) => {
    setModalType(type);
    setFormData({
      name: '',
      category: '',
      netWeight: '',
      image: '',
      quantity: 0,
      price: 0,
      profit: 0,
      reorderPoint: 10
    });
    setShowModal(true);
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
    try {
      if (modalType === 'add') {
        await addProduct(formData);
      } else if (modalType === 'restock') {
        await restockProduct(formData);
      }
      await fetchStats();
      handleCloseModal();
    } catch (err) {
      console.error("Operation failed", err.response?.data || err);
      alert(`Failed to save data. Error: ${err.response?.data?.message || err.message}`);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full py-20 text-gray-500">Loading Dashboard...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Sales</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">₱{stats.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Profit</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">₱{stats.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">Low Stock Items</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.lowStockItems}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-full">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h3>
          <div className="flex flex-col space-y-4">
            <button
              onClick={() => handleOpenModal('add')}
              className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors w-full"
            >
              <Plus className="w-5 h-5" />
              <span>Add New Item</span>
            </button>
            <button
              onClick={() => handleOpenModal('restock')}
              className="flex items-center justify-center space-x-2 bg-orange-100 text-orange-700 px-4 py-3 rounded-lg hover:bg-orange-200 transition-colors w-full"
            >
              <Package className="w-5 h-5" />
              <span>Restock Item</span>
            </button>
          </div>
        </div>

        {/* Line Chart */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
              <span>Sales Overview for</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 ml-2 font-semibold"
              >
                {months.map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 ml-2 font-semibold"
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
                  const currentMonthData = stats.chartData.filter(d => {
                    const date = new Date(d.date);
                    return !isNaN(date.getTime()) && date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
                  });

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
                  />
                  <RechartsTooltip formatter={(value) => `₱${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="sales" name="Sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
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
                <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden mb-3 relative">
                  {formData.image ? (
                    <img src={formData.image} alt="Item Preview" className="w-full h-full object-cover" />
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
                {modalType === 'restock' && (
                  <datalist id="dashboard-inventory-names">
                    {[...new Set(inventory.map(i => i.name))].map(name => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                )}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {modalType === 'restock' ? 'Quantity to Add' : 'Quantity'}
                  </label>
                  <input
                    type="number"
                    required
                    min={modalType === 'restock' ? "1" : "0"}
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
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

              <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (Cost) ₱</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Profit (Markup) ₱</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={formData.profit}
                    onChange={e => setFormData({ ...formData, profit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
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
