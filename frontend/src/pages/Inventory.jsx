import React, { useState, useEffect } from 'react';
import { Search, Plus, Package, Edit2, Trash2, X, MinusCircle, ScanBarcode } from 'lucide-react';
import { addProduct, restockProduct, updateInventory, deleteProduct, addAdjustment } from '../api';
import BarcodeScanner from '../components/BarcodeScanner';
import { toast } from '../context/ToastContext';

const Inventory = ({ inventory, fetchInventory }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('add');
  const [isScanning, setIsScanning] = useState(false);
  
  // Adjustment Modal state
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [adjData, setAdjData] = useState({ productId: '', productName: '', quantity: 1, reason: 'Damage', notes: '' });

  // Settings state
  const [enableNotifications, setEnableNotifications] = useState(true);

  useEffect(() => {
    const loadSettings = () => {
      const savedSettings = localStorage.getItem('sariSariSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setEnableNotifications(parsed.enableNotifications !== false);
      }
    };
    
    loadSettings();
    window.addEventListener('settingsUpdated', loadSettings);
    return () => window.removeEventListener('settingsUpdated', loadSettings);
  }, []);
  const [formData, setFormData] = useState({
    _id: '',
    name: '',
    category: '',
    netWeight: '',
    image: '',
    quantity: 0,
    price: 0,
    profit: 0,
    reorderPoint: 10,
    expiryDate: '',
    unit: 'pcs',
    barcode: ''
  });

  const categories = ['All', ...new Set(inventory.map(item => item.category))];

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

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
    } else {
      // Switched to fixed: profit is already formData.profit
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

  const handleOpenModal = (type, item = null) => {
    setModalType(type);
    setProfitType('fixed');
    setProfitPercent('');
    if (item) {
      if (type === 'restock') {
        // Business Rule 2: Autofill ONLY barcode and category from most recent record,
        // leaving cost_price, markup, expiration_date, and quantity open for manual entry.
        setFormData({
          _id: item._id,
          name: item.name,
          category: item.category || '',
          barcode: item.barcode || '',
          netWeight: item.netWeight || '',
          image: item.image || '',
          unit: item.unit || 'pcs',
          reorderPoint: item.reorderPoint !== undefined ? item.reorderPoint : 10,
          quantity: '',
          price: '',
          profit: '',
          expiryDate: ''
        });
      } else {
        const cost = Number(item.price) || 0;
        const prof = Number(item.profit) || 0;
        if (cost > 0) {
          setProfitPercent(parseFloat(((prof / cost) * 100).toFixed(2)).toString());
        }
        setFormData({
          _id: item._id,
          name: item.name,
          category: item.category,
          netWeight: item.netWeight || '',
          image: item.image || '',
          quantity: item.quantity,
          price: item.price,
          profit: item.profit,
          reorderPoint: item.reorderPoint,
          expiryDate: item.expiryDate || '',
          unit: item.unit || 'pcs',
          barcode: item.barcode || ''
        });
      }
    } else {
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
    }
    setShowModal(true);
  };

  const handleRestockProductSelect = (selectedId) => {
    const prod = inventory.find(p => p._id === selectedId);
    if (!prod) return;
    setProfitType('fixed');
    setProfitPercent('');
    // Business Rule 2: Autofill ONLY barcode and category from most recent record,
    // leaving cost_price, markup, expiration_date, and quantity open for manual entry.
    setFormData({
      _id: prod._id,
      name: prod.name,
      barcode: prod.barcode || '',
      category: prod.category || '',
      netWeight: prod.netWeight || '',
      image: prod.image || '',
      unit: prod.unit || 'pcs',
      reorderPoint: prod.reorderPoint !== undefined ? prod.reorderPoint : 10,
      quantity: '',
      price: '',
      profit: '',
      expiryDate: ''
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Rule 1: Expiration date is strictly required
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
        reorderPoint: Number(formData.reorderPoint) || 10
      };
      if (modalType === 'add') {
        await addProduct(payload);
      } else if (modalType === 'restock') {
        await restockProduct(payload);
      } else if (modalType === 'edit') {
        await updateInventory(formData._id, payload);
      }
      await fetchInventory();
      window.dispatchEvent(new Event('inventoryUpdated'));
      handleCloseModal();
      toast.success(modalType === 'add' ? 'Product added successfully!' : modalType === 'restock' ? 'Stock updated successfully!' : 'Product updated successfully!');
    } catch (err) {
      console.error("Operation failed", err.response?.data || err);
      toast.error(`Failed to save data. Error: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleOpenAdjModal = (item) => {
    setAdjData({ productId: item._id, productName: item.name, quantity: 1, reason: 'Damage', notes: '' });
    setShowAdjModal(true);
  };

  const handleCloseAdjModal = () => {
    setShowAdjModal(false);
  };

  const handleAdjSubmit = async (e) => {
    e.preventDefault();
    try {
      await addAdjustment(adjData);
      await fetchInventory();
      window.dispatchEvent(new Event('inventoryUpdated'));
      handleCloseAdjModal();
      toast.success('Adjustment logged successfully!');
    } catch (err) {
      console.error("Adjustment failed", err.response?.data || err);
      toast.error(`Failed to log adjustment. Error: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      try {
        await deleteProduct(id);
        await fetchInventory();
        window.dispatchEvent(new Event('inventoryUpdated'));
        toast.success('Product deleted successfully');
      } catch (err) {
        console.error("Delete failed", err);
        toast.error('Failed to delete item');
      }
    }
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

  const totalCostCalc = (Number(formData.price) || 0) + (Number(formData.profit) || 0);

  const currentMonthString = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Inventory Management</h2>
        <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{currentMonthString}</span>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-t-2xl border border-gray-200 border-b-0 p-4 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full md:w-64 transition-all"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full md:w-auto transition-all"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="flex space-x-3 w-full md:w-auto">
          <button
            onClick={() => handleOpenModal('restock')}
            className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-orange-50 text-orange-700 px-4 py-2 rounded-xl hover:bg-orange-100 transition-colors font-medium"
          >
            <Package className="w-5 h-5" />
            <span>Restock</span>
          </button>
          <button
            onClick={() => handleOpenModal('add')}
            className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-b-2xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barcode (ID)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price (Cost)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total (Selling)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(() => {
              const displayItems = [];
              filteredInventory.forEach(item => {
                const activeBatches = (item.batches || []).filter(b => (Number(b.quantity) || 0) > 0);
                const hasDifferentCosts = activeBatches.length > 1 && activeBatches.some(b => 
                  Number(b.price) !== Number(activeBatches[0].price) || 
                  Number(b.profit) !== Number(activeBatches[0].profit)
                );

                if (hasDifferentCosts) {
                  activeBatches.forEach((batch, idx) => {
                    displayItems.push({
                      ...item,
                      displayKey: `${item._id}_batch_${batch._id || idx}`,
                      batchIndex: idx + 1,
                      isBatchSplit: true,
                      quantity: batch.quantity,
                      price: Number(batch.price) || 0,
                      profit: Number(batch.profit) || 0,
                      totalCost: Number(batch.totalCost) || ((Number(batch.price) || 0) + (Number(batch.profit) || 0)),
                      expiryDate: batch.expiryDate || '',
                      originalItem: item
                    });
                  });
                } else {
                  displayItems.push({
                    ...item,
                    displayKey: item._id,
                    isBatchSplit: false,
                    originalItem: item
                  });
                }
              });

              if (displayItems.length === 0) {
                return (
                  <tr>
                    <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                      No items found.
                    </td>
                  </tr>
                );
              }

              return displayItems.map(item => {
                let isExpired = false;
                if (item.expiryDate) {
                  const expiry = new Date(item.expiryDate);
                  const now = new Date();
                  now.setHours(0, 0, 0, 0);
                  if (expiry < now) isExpired = true;
                }
                const isLowStock = item.quantity <= item.reorderPoint;
                let rowClass = '';
                if (isExpired && enableNotifications) rowClass = 'bg-red-50 hover:bg-red-100';
                else if (isLowStock && enableNotifications) rowClass = 'bg-yellow-50 hover:bg-yellow-100';
                else rowClass = 'hover:bg-gray-50 transition-colors border-b border-gray-100';

                return (
                  <tr key={item.displayKey} className={rowClass}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.barcode || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          {item.name} {item.netWeight ? `(${item.netWeight})` : ''}
                        </span>
                        {item.isBatchSplit && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                            Batch #{item.batchIndex}
                          </span>
                        )}
                        {isExpired && enableNotifications ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500 text-white">
                            Expired
                          </span>
                        ) : isLowStock && enableNotifications && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-400 text-yellow-900">
                            Low Stock
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`${isLowStock ? 'text-yellow-600' : 'text-gray-600'}`}>
                        {item.quantity} {item.unit || 'pcs'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.expiryDate ? (
                        <div>
                          <div className="font-medium text-gray-900">
                            {new Date(item.expiryDate).toLocaleDateString()}
                          </div>
                          {!item.isBatchSplit && (() => {
                            const activeBatches = (item.batches || []).filter(b => b.quantity > 0);
                            if (activeBatches.length > 1) {
                              return (
                                <div className="group relative inline-block cursor-pointer mt-0.5">
                                  <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full hover:bg-blue-100 transition-colors">
                                    {activeBatches.length} batches
                                  </span>
                                  <div className="hidden group-hover:block absolute bottom-full left-0 mb-1 z-30 bg-gray-900 text-white text-xs rounded-xl py-2 px-3 shadow-xl min-w-[200px] pointer-events-none">
                                    <div className="font-semibold text-[11px] text-gray-300 border-b border-gray-700 pb-1 mb-1.5">
                                      Active Batches:
                                    </div>
                                    <div className="space-y-1">
                                      {activeBatches.map((b, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-[10px]">
                                          <span className="text-gray-300">Batch {idx + 1}: {b.quantity} {item.unit || 'pcs'}</span>
                                          <span className="font-semibold text-white ml-2">
                                            {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : 'No exp'}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      ) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">₱{item.price.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">₱{item.profit.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">₱{item.totalCost.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-3">
                        <button onClick={() => handleOpenModal('restock', item.originalItem || item)} className="text-gray-400 hover:text-orange-600 transition-colors" title="Restock">
                          <Package className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleOpenAdjModal(item.originalItem || item)} className="text-gray-400 hover:text-gray-900 transition-colors" title="Adjust Stock">
                          <MinusCircle className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleOpenModal('edit', item.originalItem || item)} className="text-gray-400 hover:text-gray-900 transition-colors" title="Edit">
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleDelete((item.originalItem || item)._id)} className="text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
              <h3 className="text-lg font-bold text-gray-900">
                {modalType === 'add' && 'Add New Item'}
                {modalType === 'restock' && 'Restock Item'}
                {modalType === 'edit' && 'Edit Item'}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Product to Restock *</label>
                  <select
                    value={formData._id || ''}
                    onChange={e => handleRestockProductSelect(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors font-medium text-gray-900 bg-white"
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
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})}
                    disabled={modalType === 'edit'}
                    className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-100"
                    list="inventory-names"
                  />
                  <datalist id="inventory-names">
                    {[...new Set(inventory.map(i => i.name))].map(name => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Barcode / ID</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={e => setFormData({...formData, barcode: e.target.value})}
                      placeholder="Scan or type"
                      className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    <button 
                      type="button" 
                      onClick={() => setIsScanning(true)}
                      className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      title="Scan Barcode"
                    >
                      <ScanBarcode className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value.toUpperCase()})}
                    className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    list="inventory-categories"
                  />
                  <datalist id="inventory-categories">
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
                    onChange={e => setFormData({...formData, netWeight: e.target.value})}
                    placeholder="e.g. 500g, 1kg"
                    className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={e => setFormData({...formData, unit: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                    onChange={e => setFormData({...formData, quantity: e.target.value === '' ? '' : Number(e.target.value)})}
                    placeholder="Enter quantity"
                    className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Alert (Threshold)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.reorderPoint}
                    onChange={e => setFormData({...formData, reorderPoint: Number(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                  onChange={e => setFormData({...formData, expiryDate: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (Cost) ₱ *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={e => handlePriceChange(e.target.value)}
                    placeholder="Enter cost"
                    className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Profit (Markup) *</label>
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
                      className="flex-1 min-w-0 block w-full px-3 py-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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

              <div className="bg-blue-50 p-4 rounded-xl mt-4 flex justify-between items-center border border-blue-100">
                <span className="text-sm font-semibold text-blue-700">Total Selling Price:</span>
                <span className="text-xl font-bold text-blue-600">₱{totalCostCalc.toFixed(2)}</span>
              </div>

              <div className="pt-4 flex space-x-3 shrink-0">
                <button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors">
                  {modalType === 'edit' ? 'Save Changes' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      {showAdjModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
              <h3 className="text-lg font-bold text-gray-900">
                Adjust Stock: {adjData.productName}
              </h3>
              <button onClick={handleCloseAdjModal} className="text-gray-400 hover:text-gray-900 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAdjSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <select
                  value={adjData.reason}
                  onChange={e => setAdjData({...adjData, reason: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                >
                  <option value="Damage">Damage</option>
                  <option value="Loss">Loss</option>
                  <option value="Expired">Expired</option>
                  <option value="Theft">Theft</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (Deduct)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={adjData.quantity}
                  onChange={e => setAdjData({...adjData, quantity: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={adjData.notes}
                  onChange={e => setAdjData({...adjData, notes: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  rows="3"
                ></textarea>
              </div>
              
              <div className="pt-4 flex space-x-3">
                <button type="button" onClick={handleCloseAdjModal} className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors">
                  Deduct Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Scanner Overlay */}
      {isScanning && (
        <BarcodeScanner 
          onScan={(text) => {
            setFormData({...formData, barcode: text});
            setIsScanning(false);
          }} 
          onClose={() => setIsScanning(false)} 
        />
      )}
    </div>
  );
};

export default Inventory;
