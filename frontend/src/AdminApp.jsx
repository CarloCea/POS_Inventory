import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ShoppingCart, Eye, EyeOff } from 'lucide-react';

// Components
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import TopSelling from './pages/TopSelling';
import Inventory from './pages/Inventory';
import Settings from './pages/Settings';
import Adjustments from './pages/Adjustments';

// API
import { getInventory, login, forgotPassword, verifyOtp, resetPassword } from './api';

const AdminApp = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('adminLoggedIn') === 'true';
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Forgot Password State
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [fpStep, setFpStep] = useState(1);
  const [fpEmail, setFpEmail] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpMessage, setFpMessage] = useState('');
  const [fpError, setFpError] = useState('');
  
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInventory = async () => {
    try {
      const data = await getInventory();
      setInventory(data);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchInventory();
    }
  }, [isLoggedIn]);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    try {
      setLoginError('');
      const res = await login({ username, password });
      if (res.success) {
        if (res.role !== 'Administrator') {
          setLoginError('Access denied. Only Administrators can access this portal.');
          return;
        }
        setIsLoggedIn(true);
        localStorage.setItem('adminLoggedIn', 'true');
        localStorage.setItem('adminUsername', res.username);
      }
    } catch (err) {
      setLoginError(err.response?.data?.message || 'Invalid username or password');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminUsername');
    setUsername('');
    setPassword('');
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      setFpError('');
      setFpMessage('Sending OTP...');
      const res = await forgotPassword(fpEmail);
      setFpMessage(res.message || 'OTP sent successfully!');
      setTimeout(() => {
        setFpMessage('');
        setFpStep(2);
      }, 1500);
    } catch (err) {
      setFpMessage('');
      setFpError(err.response?.data?.message || 'Failed to send OTP');
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    try {
      setFpError('');
      await verifyOtp({ email: fpEmail, otp: fpOtp });
      setFpStep(3);
    } catch (err) {
      setFpError(err.response?.data?.message || 'Invalid OTP');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      setFpError('');
      await resetPassword({ email: fpEmail, otp: fpOtp, newPassword: fpNewPassword });
      setFpMessage('Password reset successful! You can now login.');
      setTimeout(() => {
        setIsForgotPassword(false);
        setFpStep(1);
        setFpEmail('');
        setFpOtp('');
        setFpNewPassword('');
        setFpMessage('');
      }, 2000);
    } catch (err) {
      setFpError(err.response?.data?.message || 'Reset failed');
    }
  };

  if (!isLoggedIn) {
    if (isForgotPassword) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 w-full max-w-md mx-4">
            <div className="text-center mb-8">
              <ShoppingCart className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900">Reset Admin Password</h1>
              <p className="text-gray-600 mt-2 text-sm">
                {fpStep === 1 && "Enter your username or email to receive an OTP"}
                {fpStep === 2 && "Enter the 6-digit OTP sent to your email"}
                {fpStep === 3 && "Create a new secure password"}
              </p>
            </div>

            {fpMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">
                {fpMessage}
              </div>
            )}

            {fpError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                {fpError}
              </div>
            )}

            {fpStep === 1 && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    required
                    value={fpEmail}
                    onChange={(e) => setFpEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Enter your registered email"
                  />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
                  Send OTP
                </button>
              </form>
            )}

            {fpStep === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">6-Digit OTP</label>
                  <input
                    type="text"
                    required
                    value={fpOtp}
                    onChange={(e) => setFpOtp(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none tracking-widest text-center text-lg transition-all"
                    placeholder="••••••"
                    maxLength={6}
                  />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
                  Verify OTP
                </button>
              </form>
            )}

            {fpStep === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                  <input
                    type="password"
                    required
                    value={fpNewPassword}
                    onChange={(e) => setFpNewPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Enter new password"
                  />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
                  Reset Password
                </button>
              </form>
            )}

            <div className="mt-6 text-center">
              <button 
                onClick={() => { setIsForgotPassword(false); setFpStep(1); setFpMessage(''); setFpError(''); }}
                className="text-sm text-blue-600 hover:underline"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 w-full max-w-md mx-4">
          <div className="text-center mb-8">
            <ShoppingCart className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900">Sari-Sari Store Admin</h1>
            <p className="text-gray-600 mt-2">Inventory Management System</p>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username or Email</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Enter username or email"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin(e)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all pr-12"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {loginError}
              </div>
            )}
            
            <button
              onClick={handleLogin}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Login
            </button>

            <div className="text-center mt-4">
              <button 
                onClick={() => setIsForgotPassword(true)}
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                Forgot Password?
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header handleLogout={handleLogout} />
        
        <main className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-full min-h-[50vh]">
              <div className="text-xl text-gray-600 flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <span>Loading application data...</span>
              </div>
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<Dashboard inventory={inventory} />} />
              <Route path="/top-selling" element={<TopSelling inventory={inventory} />} />
              <Route path="/inventory" element={<Inventory inventory={inventory} fetchInventory={fetchInventory} />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/adjustments" element={<Adjustments />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </main>
      </div>
    </Router>
  );
};

export default AdminApp;
