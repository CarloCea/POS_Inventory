import React, { useState, useEffect } from 'react';
import { Save, Plus, User, Trash2, Edit2, X } from 'lucide-react';
import { getUsers, createUser, updateUser, deleteUser, forgotPassword, verifyOtp, resetPassword } from '../api';

const Settings = () => {
  const [settings, setSettings] = useState({
    storeName: 'Sari-Sari Store',
    lowStockThresholdGlobal: 10,
    enableNotifications: true
  });

  const [accounts, setAccounts] = useState([]);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showEditAccount, setShowEditAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({ username: '', email: '', password: '', role: 'Cashier' });
  const [editingAccount, setEditingAccount] = useState(null);
  const [editForm, setEditForm] = useState({ email: '', role: 'Cashier' });
  
  // Password change state within Edit Modal
  const [pwdStep, setPwdStep] = useState(0); // 0: button, 1: otp sent, 2: verify otp, 3: enter new pwd
  const [pwdOtp, setPwdOtp] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdMessage, setPwdMessage] = useState('');
  const [pwdError, setPwdError] = useState('');

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('sariSariSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const data = await getUsers();
      setAccounts(data);
    } catch (err) {
      console.error("Failed to fetch accounts", err);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem('sariSariSettings', JSON.stringify(settings));
    // Also dispatch a custom event to notify other components (like Inventory)
    window.dispatchEvent(new Event('settingsUpdated'));
    alert('Settings saved successfully!');
  };

  const handleAddAccount = async () => {
    if (newAccount.username && newAccount.password && newAccount.email) {
      try {
        await createUser(newAccount);
        setNewAccount({ username: '', email: '', password: '', role: 'Cashier' });
        setShowAddAccount(false);
        fetchAccounts();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to create account');
      }
    } else {
      alert("Please fill in all required fields.");
    }
  };

  const handleDeleteAccount = async (id, role) => {
    if (role === 'Administrator' && accounts.filter(a => a.role === 'Administrator').length <= 1) {
      alert("Cannot delete the last administrator account.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this account?")) {
      try {
        await deleteUser(id);
        fetchAccounts();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete account');
      }
    }
  };

  const openEditModal = (acc) => {
    setEditingAccount(acc);
    setEditForm({ email: acc.email, role: acc.role });
    setPwdStep(0);
    setPwdOtp('');
    setPwdNew('');
    setPwdMessage('');
    setPwdError('');
    setShowEditAccount(true);
  };

  const handleUpdateAccount = async () => {
    try {
      const payload = { email: editForm.email, role: editForm.role };
      await updateUser(editingAccount._id, payload);
      setShowEditAccount(false);
      setEditingAccount(null);
      fetchAccounts();
      alert("Account details updated successfully.");
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update account');
    }
  };

  const handleRequestPasswordOtp = async () => {
    try {
      setPwdError('');
      setPwdMessage('Sending OTP...');
      await forgotPassword(editForm.email);
      setPwdMessage('OTP sent to ' + editForm.email);
      setPwdStep(1);
    } catch (err) {
      setPwdMessage('');
      setPwdError(err.response?.data?.message || 'Failed to send OTP');
    }
  };

  const handleVerifyPasswordOtp = async () => {
    try {
      setPwdError('');
      await verifyOtp({ email: editForm.email, otp: pwdOtp });
      setPwdMessage('');
      setPwdStep(2);
    } catch (err) {
      setPwdError(err.response?.data?.message || 'Invalid OTP');
    }
  };

  const handleSaveNewPassword = async () => {
    try {
      setPwdError('');
      await resetPassword({ email: editForm.email, otp: pwdOtp, newPassword: pwdNew });
      setPwdMessage('Password changed successfully!');
      setPwdStep(0);
      setPwdOtp('');
      setPwdNew('');
    } catch (err) {
      setPwdError(err.response?.data?.message || 'Failed to reset password');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Settings</h2>

      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <form onSubmit={handleSave} className="p-6 space-y-6">
          
          <div>
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">General Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
                <input
                  type="text"
                  value={settings.storeName}
                  onChange={(e) => setSettings({...settings, storeName: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Inventory Preferences</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Low Stock Threshold</label>
                <input
                  type="number"
                  value={settings.lowStockThresholdGlobal}
                  onChange={(e) => setSettings({...settings, lowStockThresholdGlobal: Number(e.target.value)})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex items-center mt-6">
                <input
                  type="checkbox"
                  id="notifications"
                  checked={settings.enableNotifications}
                  onChange={(e) => setSettings({...settings, enableNotifications: e.target.checked})}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="notifications" className="ml-2 block text-sm text-gray-900">
                  Enable Low Stock Browser Alerts
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-5 h-5" />
              <span>Save Settings</span>
            </button>
          </div>

        </form>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center border-b pb-2 mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Account Details</h3>
            <button 
              onClick={() => setShowAddAccount(!showAddAccount)}
              className="flex items-center space-x-1 text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-200"
            >
              <Plus className="w-4 h-4" />
              <span>Add Account</span>
            </button>
          </div>

          {showAddAccount && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6 border">
              <h4 className="font-medium text-gray-700 mb-3">New Account</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Username *</label>
                  <input 
                    type="text" 
                    required
                    value={newAccount.username}
                    onChange={(e) => setNewAccount({...newAccount, username: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Email Address *</label>
                  <input 
                    type="email" 
                    required
                    value={newAccount.email}
                    onChange={(e) => setNewAccount({...newAccount, email: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Password *</label>
                  <input 
                    type="password" 
                    required
                    value={newAccount.password}
                    onChange={(e) => setNewAccount({...newAccount, password: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Role</label>
                  <select 
                    value={newAccount.role}
                    onChange={(e) => setNewAccount({...newAccount, role: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 outline-none"
                  >
                    <option value="Administrator">Administrator</option>
                    <option value="Cashier">Cashier</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button onClick={() => setShowAddAccount(false)} className="px-4 py-2 text-sm border rounded-md hover:bg-gray-100">Cancel</button>
                <button onClick={handleAddAccount} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Add User</button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {accounts.map(acc => (
              <div 
                key={acc._id} 
                className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div 
                  className="flex items-center space-x-3 flex-1 cursor-pointer"
                  onClick={() => openEditModal(acc)}
                >
                  <div className="bg-blue-100 p-2 rounded-full">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">{acc.username}</p>
                    <p className="text-sm text-gray-500">{acc.email}</p>
                    <p className="text-xs text-blue-600 bg-blue-50 inline-block px-2 py-0.5 rounded-full mt-1">{acc.role}</p>
                  </div>
                </div>
                <div className="flex space-x-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); openEditModal(acc); }}
                    className="text-gray-500 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-md"
                    title="Edit Account"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteAccount(acc._id, acc.role); }}
                    className="text-gray-500 hover:text-red-600 p-2 hover:bg-red-50 rounded-md"
                    title="Delete Account"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {accounts.length === 0 && (
              <div className="text-center py-4 text-gray-500 text-sm">
                No accounts found. Create one above!
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Edit Account Modal */}
      {showEditAccount && editingAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">
                Edit Account: {editingAccount.username}
              </h3>
              <button onClick={() => setShowEditAccount(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select 
                  value={editForm.role}
                  onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 outline-none"
                >
                  <option value="Administrator">Administrator</option>
                  <option value="Cashier">Cashier</option>
                </select>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Password Management</h4>
                
                {pwdMessage && <div className="text-sm text-blue-600 mb-2">{pwdMessage}</div>}
                {pwdError && <div className="text-sm text-red-600 mb-2">{pwdError}</div>}

                {pwdStep === 0 && (
                  <button 
                    type="button" 
                    onClick={handleRequestPasswordOtp}
                    className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 py-1.5 px-3 rounded border transition-colors"
                  >
                    Change Password via Email OTP
                  </button>
                )}

                {pwdStep === 1 && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={pwdOtp}
                      onChange={(e) => setPwdOtp(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                      maxLength={6}
                    />
                    <button 
                      type="button" 
                      onClick={handleVerifyPasswordOtp}
                      className="text-sm bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded transition-colors"
                    >
                      Verify OTP
                    </button>
                  </div>
                )}

                {pwdStep === 2 && (
                  <div className="space-y-2">
                    <input
                      type="password"
                      placeholder="Enter new password"
                      value={pwdNew}
                      onChange={(e) => setPwdNew(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                    <button 
                      type="button" 
                      onClick={handleSaveNewPassword}
                      className="text-sm bg-green-600 hover:bg-green-700 text-white py-1.5 px-3 rounded transition-colors"
                    >
                      Save New Password
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-4 flex space-x-3 border-t">
                <button type="button" onClick={() => setShowEditAccount(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                  Cancel
                </button>
                <button type="button" onClick={handleUpdateAccount} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Settings;
