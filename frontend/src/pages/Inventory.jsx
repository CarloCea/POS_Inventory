import React, { useState, useEffect } from 'react';
import { Search, Plus, Package, Edit2, Trash2, X } from 'lucide-react';
import { addProduct, restockProduct, updateInventory, deleteProduct } from '../api';

const Inventory = ({ inventory, fetchInventory }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('add'); // 'add', 'restock', 'edit'
  
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
    reorderPoint: 10
  });

  const categories = ['All', ...new Set(inventory.map(item => item.category))];

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenModal = (type, item = null) => {
    setModalType(type);
    if (item) {
      setFormData({
        _id: item._id,
        name: item.name,
        category: item.category,
        netWeight: item.netWeight || '',
        image: item.image || '',
        quantity: type === 'restock' ? 0 : item.quantity,
        price: item.price,
        profit: item.profit,
        reorderPoint: item.reorderPoint
      });
    } else {
      setFormData({
        _id: '',
        name: '',
        category: '',
        netWeight: '',
        image: '',
        quantity: 0,
        price: 0,
        profit: 0,
        reorderPoint: 10
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalType === 'add') {
        await addProduct(formData);
      } else if (modalType === 'restock') {
        await restockProduct(formData);
      } else if (modalType === 'edit') {
        await updateInventory(formData._id, formData);
      }
      await fetchInventory();
      handleCloseModal();
    } catch (err) {
      console.error("Operation failed", err.response?.data || err);
      alert(`Failed to save data. Error: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      try {
        await deleteProduct(id);
        await fetchInventory();
      } catch (err) {
        console.error("Delete failed", err);
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Inventory Management</h2>

      {/* Toolbar */}
      <div className="bg-white rounded-t-lg shadow p-4 border-b flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
              className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-64"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-auto"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="flex space-x-3 w-full md:w-auto">
          <button
            onClick={() => handleOpenModal('restock')}
            className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-lg hover:bg-orange-200 transition-colors"
          >
            <Package className="w-5 h-5" />
            <span>Restock</span>
          </button>
          <button
            onClick={() => handleOpenModal('add')}
            className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-b-lg shadow overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price (Cost)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total (Selling)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredInventory.map(item => (
              <tr key={item._id} className={item.quantity <= item.reorderPoint && enableNotifications ? 'bg-red-100' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="font-medium text-gray-900">{item.name}</span>
                    {item.quantity <= item.reorderPoint && enableNotifications && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        Low Stock
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.category}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`font-semibold ${item.quantity <= item.reorderPoint ? 'text-red-600' : 'text-gray-900'}`}>
                    {item.quantity}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">₱{item.price.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">₱{item.profit.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap font-bold text-blue-600">₱{item.totalCost.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-3">
                    <button onClick={() => handleOpenModal('edit', item)} className="text-blue-600 hover:text-blue-900">
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDelete(item._id)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredInventory.length === 0 && (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                  No items found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
              <h3 className="text-lg font-bold text-gray-800">
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
                  onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})}
                  disabled={modalType === 'edit'}
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  list="inventory-names"
                />
                {modalType === 'restock' && (
                  <datalist id="inventory-names">
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
                  onChange={e => setFormData({...formData, category: e.target.value.toUpperCase()})}
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                  list="inventory-categories"
                />
                <datalist id="inventory-categories">
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
                  onChange={e => setFormData({...formData, netWeight: e.target.value})}
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
                    onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
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
                    onChange={e => setFormData({...formData, reorderPoint: Number(e.target.value)})}
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
                    onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
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
                    onChange={e => setFormData({...formData, profit: parseFloat(e.target.value) || 0})}
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
                  {modalType === 'edit' ? 'Save Changes' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
