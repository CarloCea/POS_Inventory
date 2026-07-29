import React, { useState, useEffect } from 'react';
import { ShoppingCart, Eye, EyeOff, LogOut, Monitor, KeyRound } from 'lucide-react';

// Components
import POS from './pages/POS';

// API
import { getInventory, getTodaySales, login, forgotPassword, verifyOtp, resetPassword } from './api';

const POSApp = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [todaySales, setTodaySales] = useState(0);

  // Forgot password state
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [fpStep, setFpStep] = useState(1); // 1: email, 2: otp, 3: new password
  const [fpEmail, setFpEmail] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpMessage, setFpMessage] = useState('');
  const [fpError, setFpError] = useState('');

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

  const fetchSales = async (cashier) => {
    try {
      const data = await getTodaySales(cashier);
      setTodaySales(data.totalSales || 0);
    } catch (error) {
      console.error("Error fetching sales:", error);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchInventory();
      fetchSales(username);
      
      const interval = setInterval(() => {
        fetchSales(username);
      }, 30000); // every 30s
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, username]);

  const handleLogin = async (e) => {
    if(e) e.preventDefault();
    try {
      setLoginError('');
      const res = await login({ username, password });
      if (res.success) {
        setIsLoggedIn(true);
      }
    } catch (err) {
      setLoginError(err.response?.data?.message || 'Login failed');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
    setTodaySales(0);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      setFpError('');
      setFpMessage('Sending OTP...');
      await forgotPassword(fpEmail);
      setFpMessage('OTP sent successfully!');
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
        <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md mx-4">
            <div className="text-center mb-6">
              <KeyRound className="w-16 h-16 text-purple-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800">Forgot Password</h2>
              <p className="text-gray-600 mt-2">
                {fpStep === 1 && "Enter your email to receive an OTP."}
                {fpStep === 2 && "Enter the OTP sent to your email."}
                {fpStep === 3 && "Create a new password."}
              </p>
            </div>

            {fpMessage && (
              <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm text-center">
                {fpMessage}
              </div>
            )}
            {fpError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm text-center">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    placeholder="Enter your email"
                  />
                </div>
                <button type="submit" className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none tracking-widest text-center text-lg"
                    placeholder="••••••"
                    maxLength={6}
                  />
                </div>
                <button type="submit" className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    placeholder="Enter new password"
                  />
                </div>
                <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700">
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
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md mx-4">
          <div className="text-center mb-8">
            <ShoppingCart className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800">Sari-Sari Store POS</h1>
            <p className="text-gray-600 mt-2">Point of Sale System</p>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Enter username"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all pr-12"
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
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 shadow-md"
            >
              Login
            </button>

            <div className="text-center mt-4">
              <button 
                onClick={() => setIsForgotPassword(true)}
                className="text-sm text-blue-600 hover:underline"
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* POS Specific Header */}
      <header className="bg-white shadow-md relative z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3 shrink-0">
            <Monitor className="w-8 h-8 text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-800">POS Terminal</h1>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex flex-col text-right">
              <span className="text-sm text-gray-500 font-medium">Cashier: <span className="text-gray-800">{username}</span></span>
              <span className="text-xs text-gray-500">Today's Sales: <span className="font-bold text-green-600">₱{todaySales.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 text-red-600 hover:text-red-700 font-medium border-l pl-4 border-gray-300"
            >
              <LogOut className="w-5 h-5 md:w-4 md:h-4" />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-full min-h-[50vh]">
            <div className="text-xl text-gray-600 flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
              <span>Loading terminal...</span>
            </div>
          </div>
        ) : (
          <POS 
            inventory={inventory} 
            fetchInventory={fetchInventory} 
            cashier={username}
            onSaleCompleted={() => fetchSales(username)}
          />
        )}
      </main>
    </div>
  );
};

export default POSApp;
