import React, { useState } from 'react';
import { ShoppingCart, LogOut, LayoutDashboard, Package, TrendingUp, Monitor, Settings as SettingsIcon, Menu, X } from 'lucide-react';
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
    { name: 'Settings', path: '/settings', icon: <SettingsIcon className="w-4 h-4" /> },
  ];

  // POS header is handled natively in POSApp

  return (
    <header className="bg-white shadow-md relative z-40">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3 shrink-0">
          <ShoppingCart className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-800">Sari-Sari Store</h1>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center space-x-6 ml-4">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center space-x-1 ${link.extraClass || ''} ${isActive(link.path) ? (link.extraClass ? link.extraClass : 'text-blue-600 font-medium') : 'text-gray-600 hover:text-blue-600 font-medium'
                }`}
            >
              {link.icon}
              <span>{link.name}</span>
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1 text-red-600 hover:text-red-700 font-medium ml-4 border-l pl-4 border-gray-300"
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
        <nav className="md:hidden bg-white border-t border-gray-200 absolute w-full shadow-lg">
          <div className="px-4 py-2 flex flex-col space-y-2">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-3 py-3 rounded-lg ${isActive(link.path) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                {link.icon}
                <span>{link.name}</span>
              </Link>
            ))}
            <button
              onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
              className="flex items-center space-x-3 px-3 py-3 text-red-600 hover:bg-red-50 rounded-lg w-full text-left"
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
