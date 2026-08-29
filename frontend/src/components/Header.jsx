import React, { useState } from 'react';
import { ShoppingCart, LogOut, LayoutDashboard, Package, TrendingUp, Settings as SettingsIcon, Menu, X, ClipboardList } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Header = ({ handleLogout }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => currentPath === path;

  const navLinks = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-4 h-4" /> },
    { name: 'Top Selling', path: '/top-selling', icon: <TrendingUp className="w-4 h-4" /> },
    { name: 'Inventory', path: '/inventory', icon: <Package className="w-4 h-4" /> },
    { name: 'Stock Logs', path: '/adjustments', icon: <ClipboardList className="w-4 h-4" /> },
    { name: 'Settings', path: '/settings', icon: <SettingsIcon className="w-4 h-4" /> },
  ];

  // POS header is handled natively in POSApp

  return (
    <header className="bg-white border-b border-gray-200 relative z-40">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3 shrink-0">
          <ShoppingCart className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Sari-Sari Store</h1>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center space-x-6 ml-4">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center space-x-1 ${link.extraClass || ''} ${isActive(link.path) ? (link.extraClass ? link.extraClass : 'text-blue-600 font-semibold') : 'text-gray-500 hover:text-gray-900 font-medium transition-colors'
                }`}
            >
              {link.icon}
              <span>{link.name}</span>
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1 text-red-500 hover:text-red-700 font-medium ml-4 border-l pl-4 border-gray-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </nav>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden text-gray-600 hover:text-gray-900"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Nav Dropdown */}
      {mobileMenuOpen && (
        <nav className="md:hidden bg-white border-b border-gray-200 absolute w-full">
          <div className="px-4 py-4 flex flex-col space-y-4">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-2 py-2 ${isActive(link.path) ? 'text-blue-600 font-semibold' : 'text-gray-500 hover:text-gray-900 font-medium transition-colors'
                  }`}
              >
                {link.icon}
                <span>{link.name}</span>
              </Link>
            ))}
            <button
              onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
              className="flex items-center space-x-2 py-2 text-red-500 hover:text-red-700 font-medium border-t border-gray-100 mt-2 pt-4 transition-colors text-left w-full"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </nav>
      )}
    </header>
  );
};

export default Header;
