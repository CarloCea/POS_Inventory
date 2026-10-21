import React, { useState } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Printer, X, Receipt, Search, ScanBarcode } from 'lucide-react';
import { processCheckout } from '../api';
import TransactionHistory from './TransactionHistory';
import BarcodeScanner from '../components/BarcodeScanner';
import { toast } from '../context/ToastContext';

const POS = ({ inventory, fetchInventory, cashier, onSaleCompleted }) => {
  const [cart, setCart] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('checkout');
  
  const [cash, setCash] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [mobileView, setMobileView] = useState('products'); // 'products' or 'cart'

  const categories = ['All', ...new Set(inventory.map(i => i.category).filter(Boolean))];
  const filteredInventory = inventory.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
                          item.name.toLowerCase().includes(searchLower) || 
                          (item.barcode && item.barcode.includes(searchTerm));
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product) => {
    if (product.expiryDate) {
      const expiry = new Date(product.expiryDate);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (expiry < now) {
        const validBatches = (product.batches || []).filter(b => b.quantity > 0 && (!b.expiryDate || new Date(b.expiryDate) >= now));
        if (validBatches.length === 0) {
          toast.warning(`Cannot add expired product: ${product.name}`);
          return;
        }
      }
    }
    setCart(prev => {
      const existing = prev.find(item => item._id === product._id);
      if (existing) {
        if (existing.cartQuantity >= product.quantity) return prev;
        return prev.map(item => 
          item._id === product._id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item
        );
      }
      return [...prev, { ...product, cartQuantity: 1 }];
    });
  };

  const updateCartQuantity = (id, change) => {
    setCart(prev => {
      return prev.map(item => {
        if (item._id === id) {
          const product = inventory.find(p => p._id === id);
          const newQuantity = Math.max(1, Math.min(item.cartQuantity + change, product.quantity));
          return { ...item, cartQuantity: newQuantity };
        }
        return item;
      });
    });
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item._id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setCash('');
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.totalCost * item.cartQuantity), 0);
  const cashAmount = parseFloat(cash) || 0;
  const changeAmount = cashAmount - cartTotal;
  const canCheckout = cart.length > 0 && !isProcessing && cashAmount >= cartTotal;

  const handleCheckout = async () => {
    if (!canCheckout) return;
    setIsProcessing(true);
    
    try {
      const orderData = {
        items: cart,
        totalAmount: cartTotal,
        cashier: cashier || 'Unknown'
      };
      const response = await processCheckout(orderData);
      
      setLastOrder({
        ...response.order,
        cashGiven: cashAmount,
        change: changeAmount
      });
      
      setCart([]);
      setCash('');
      await fetchInventory();
      window.dispatchEvent(new Event('inventoryUpdated'));
      if (onSaleCompleted) onSaleCompleted();
      setShowReceipt(true);
      toast.success("Purchase completed successfully!");
    } catch (error) {
      console.error("Checkout failed", error);
      toast.error("Checkout failed. Check stock levels or backend connection.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-4 h-full flex flex-col gap-2 sm:gap-4 overflow-hidden">
      
      {/* POS Sub-navigation */}
      <div className="flex justify-between items-center border-b pb-2 shrink-0 gap-2">
        <div className="flex space-x-2">
          <button 
            onClick={() => setActiveTab('checkout')}
            className={`font-semibold px-3 sm:px-4 py-1.5 text-xs sm:text-sm rounded-lg sm:rounded-t-xl transition-colors ${activeTab === 'checkout' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Point of Sale
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`font-semibold px-3 sm:px-4 py-1.5 text-xs sm:text-sm rounded-lg sm:rounded-t-xl transition-colors ${activeTab === 'history' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            History
          </button>
        </div>

        {activeTab === 'checkout' && (
          <div className="lg:hidden flex bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs">
            <button
              onClick={() => setMobileView('products')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                mobileView === 'products'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setMobileView('cart')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center space-x-1 ${
                mobileView === 'cart'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>Cart</span>
              {cart.length > 0 && (
                <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1">
                  {cart.reduce((sum, item) => sum + item.cartQuantity, 0)}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {activeTab === 'checkout' ? (
        <div className="flex flex-col lg:flex-row gap-3 md:gap-6 flex-1 min-h-0 overflow-hidden">
          {/* Product List */}
          <div className={`w-full lg:w-2/3 bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 flex flex-col flex-1 h-full overflow-hidden min-h-0 ${
            mobileView === 'cart' ? 'hidden lg:flex' : 'flex'
          }`}>
            <div className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-gray-100 shrink-0">
              <div className="flex justify-between items-center mb-2 sm:mb-3">
                <h2 className="text-base sm:text-xl font-bold text-gray-900">Products</h2>
                <button 
                  onClick={() => setIsScanning(true)}
                  className="flex items-center space-x-1 bg-blue-50 text-blue-600 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl hover:bg-blue-100 transition-colors"
                >
                  <ScanBarcode className="w-4 h-4" />
                  <span className="text-xs sm:text-sm font-medium">Scan</span>
                </button>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 mb-2 sm:mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by name or barcode..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 sm:py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="flex space-x-1.5 sm:space-x-2 overflow-x-auto pb-1 scrollbar-hide">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === cat 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-2 sm:p-4 md:p-6 overflow-y-auto flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 content-start">
              {filteredInventory.map(item => {
                let isExpired = false;
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                if (item.expiryDate) {
                  const expiry = new Date(item.expiryDate);
                  if (expiry < now) {
                    const validBatches = (item.batches || []).filter(b => b.quantity > 0 && (!b.expiryDate || new Date(b.expiryDate) >= now));
                    if (validBatches.length === 0) {
                      isExpired = true;
                    }
                  }
                }
                const isDisabled = item.quantity === 0 || isExpired;
                return (
                <div
                  key={item._id}
                  onClick={() => !isDisabled && addToCart(item)}
                  role="button"
                  tabIndex={0}
                  className={`rounded-2xl border transition-all flex flex-col relative overflow-hidden ${
                    item.image ? 'p-0' : 'p-1.5 sm:p-3'
                  } ${
                    isDisabled 
                      ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60' 
                      : 'bg-white border-gray-100 hover:border-gray-400 hover:shadow-md cursor-pointer'
                  }`}
                >
                  {isExpired && (
                    <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg z-20">
                      EXPIRED
                    </div>
                  )}
                  {item.image ? (
                    <div className="relative w-full h-full flex flex-col justify-between flex-1 min-h-[150px] p-2.5 sm:p-3 overflow-hidden">
                      {/* Product Image Layer */}
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300" 
                      />
                      {/* Smooth vertical gradient overlay to guarantee high contrast and readability over any product picture */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/60 pointer-events-none" />

                      {/* Centered Content: Name, Unit, Category & Net Wt. Pills */}
                      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center p-1">
                        <h3 className="font-bold text-white text-sm sm:text-base leading-snug line-clamp-3 mb-1 break-words drop-shadow-sm">
                          {item.name}
                        </h3>
                        <span className="text-white/80 text-[10px] sm:text-xs block font-normal mb-1.5 drop-shadow-xs">
                          / {item.unit || 'pcs'}
                        </span>
                        <div className="flex flex-wrap justify-center gap-1.5">
                          <span className="text-white font-medium text-[9px] sm:text-[10px] border border-white/30 rounded-full px-2.5 py-0.5 bg-black/40 backdrop-blur-xs shadow-xs">
                            {item.category}
                          </span>
                          {item.netWeight && (
                            <span className="text-white font-medium text-[9px] sm:text-[10px] border border-white/30 rounded-full px-2.5 py-0.5 bg-black/40 backdrop-blur-xs shadow-xs">
                              {item.netWeight}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Row: Price and Stock Left */}
                      <div className="relative z-10 mt-auto pt-2.5 px-0.5 flex justify-between items-center w-full gap-1 border-t border-white/20 shrink-0">
                        <span className="font-bold text-white text-xs sm:text-sm drop-shadow-sm">
                          ₱{(item.totalCost || (item.price + (item.profit||0))).toFixed(2)}
                        </span>
                        <span className={`text-[8px] sm:text-[10px] px-2 py-0.5 rounded-full font-medium backdrop-blur-xs ${
                          item.quantity > 0 ? 'bg-white/20 text-white border border-white/20' : 'bg-red-500/80 text-white'
                        }`}>
                          {item.quantity > 0 ? `${item.quantity} left` : 'Out'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col justify-between w-full h-full flex-1 min-h-[150px]">
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-1 sm:p-2">
                        <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-snug line-clamp-4 mb-1 break-words whitespace-normal">
                          {item.name}
                        </h3>
                        <span className="text-gray-500 text-[10px] sm:text-xs block font-normal mb-1.5">/ {item.unit || 'pcs'}</span>
                        <div className="flex flex-wrap justify-center gap-1.5">
                          <span className="text-gray-600 font-medium text-[9px] sm:text-[10px] border border-gray-200 rounded-full px-2.5 py-0.5 bg-gray-50">{item.category}</span>
                          {item.netWeight && (
                            <span className="text-gray-600 font-medium text-[9px] sm:text-[10px] border border-gray-200 rounded-full px-2.5 py-0.5 bg-gray-50">{item.netWeight}</span>
                          )}
                        </div>
                      </div>
                      <div className="mt-auto pt-2.5 px-1 flex justify-between items-center w-full gap-1 border-t border-gray-100 shrink-0">
                        <span className="font-bold text-gray-900 text-xs sm:text-sm">₱{(item.totalCost || (item.price + (item.profit||0))).toFixed(2)}</span>
                        <span className={`text-[8px] sm:text-[10px] px-2 py-0.5 rounded-full font-medium ${item.quantity > 0 ? 'bg-gray-100 text-gray-800' : 'bg-red-50 text-red-600'}`}>
                          {item.quantity > 0 ? `${item.quantity} left` : 'Out'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )})}
            </div>

            {/* Mobile Bottom Order Action Bar */}
            {cart.length > 0 && (
              <div className="lg:hidden p-2.5 bg-blue-50 border-t border-blue-100 flex justify-between items-center shrink-0">
                <div className="text-xs">
                  <span className="text-gray-600 block">Total ({cart.reduce((sum, item) => sum + item.cartQuantity, 0)} items)</span>
                  <span className="font-bold text-blue-700 text-sm">₱{cartTotal.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => setMobileView('cart')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center space-x-1 transition-colors"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>View Order →</span>
                </button>
              </div>
            )}
          </div>

          {/* Cart/Checkout */}
          <div className={`w-full lg:w-1/3 bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden shrink-0 ${
            mobileView === 'products' ? 'hidden lg:flex' : 'flex'
          }`}>
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setMobileView('products')}
                  className="lg:hidden text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md font-semibold hover:bg-gray-200"
                >
                  ← Back to Products
                </button>
                <h2 className="text-sm sm:text-base lg:text-xl font-bold text-gray-900 flex items-center">
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-1.5" />
                  <span>Current Order</span>
                </h2>
              </div>
              <div className="flex items-center space-x-2">
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 font-medium px-2 py-1 rounded-lg transition-colors flex items-center space-x-1 border border-red-100"
                    title="Remove all items from order"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove all</span>
                  </button>
                )}
                <span className="bg-blue-100 text-blue-700 text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-full">
                  {cart.length} items
                </span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <ShoppingCart className="w-12 h-12 mb-2 opacity-50" />
                  <p>Cart is empty</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item._id} className="flex justify-between items-center p-3 border border-gray-100 rounded-2xl bg-white shadow-sm">
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="font-semibold text-sm text-gray-900 truncate">
                        {item.name} {item.netWeight && <span className="text-gray-500 font-normal">({item.netWeight})</span>}
                        <span className="text-gray-500 font-normal ml-1">/ {item.unit || 'pcs'}</span>
                      </h4>
                      <p className="text-gray-900 text-sm font-medium">₱{item.totalCost?.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
                      <button onClick={() => updateCartQuantity(item._id, -1)} className="p-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600">
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{item.cartQuantity}</span>
                      <button onClick={() => updateCartQuantity(item._id, 1)} className="p-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600">
                        <Plus className="w-4 h-4" />
                      </button>
                      <button onClick={() => removeFromCart(item._id)} className="p-1 ml-1 sm:ml-2 rounded-md text-red-500 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 shrink-0 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium text-lg">Total</span>
                <span className="text-3xl font-bold text-gray-900">₱{cartTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Cash</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">₱</span>
                    <input 
                      type="number" 
                      value={cash}
                      onChange={(e) => setCash(e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Change</label>
                  <div className={`text-xl font-bold ${changeAmount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    ₱{changeAmount >= 0 ? changeAmount.toFixed(2) : '0.00'}
                  </div>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={!canCheckout}
                className={`w-full py-4 rounded-xl font-bold text-lg text-white transition-colors shadow-sm ${
                  !canCheckout
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isProcessing ? 'Processing...' : 'Complete Purchase'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <TransactionHistory />
      )}

      {/* Receipt Modal */}
      {showReceipt && lastOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
              <h3 className="font-bold text-gray-900 flex items-center">
                <Receipt className="w-4 h-4 mr-2" />
                Receipt
              </h3>
              <button onClick={() => setShowReceipt(false)} className="text-gray-400 hover:text-gray-900 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto" id="receipt-content">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">SARI-SARI STORE</h2>
                <p className="text-sm text-gray-500">Official Receipt</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(lastOrder.date).toLocaleString()}</p>
                <p className="text-xs text-gray-400">Cashier: {lastOrder.cashier}</p>
              </div>
              
              <div className="border-t border-b border-dashed border-gray-300 py-4 mb-4 space-y-3">
                {lastOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <div className="flex-1 pr-2">
                      <span className="font-medium text-gray-800">{item.name}</span>
                      <div className="text-xs text-gray-500">{item.quantity} x ₱{item.price.toFixed(2)} / {item.unit || 'pcs'}</div>
                    </div>
                    <span className="font-medium">₱{item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Amount</span>
                  <span>₱{lastOrder.totalSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Cash Given</span>
                  <span>₱{lastOrder.cashGiven.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Change</span>
                  <span>₱{lastOrder.change.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="mt-8 text-center text-sm font-medium text-gray-500">
                Thank you for your purchase!
              </div>
            </div>
            
            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
              <button 
                onClick={() => {
                  const content = document.getElementById('receipt-content').innerHTML;
                  const printWindow = window.open('', '', 'height=600,width=400');
                  printWindow.document.write('<html><head><title>Print Receipt</title>');
                  printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
                  printWindow.document.write('</head><body class="p-4">');
                  printWindow.document.write(content);
                  printWindow.document.write('</body></html>');
                  printWindow.document.close();
                  setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                  }, 500);
                }} 
                className="w-full flex justify-center items-center px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
              >
                <Printer className="w-5 h-5 mr-2" />
                Print
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Barcode Scanner Modal */}
      {isScanning && (
        <BarcodeScanner 
          onScan={(text) => {
            const product = inventory.find(item => item.barcode === text);
            if (product) {
              addToCart(product);
              toast.success(`Scanned: ${product.name}`);
            } else {
              toast.warning(`No product found with barcode: ${text}`);
            }
            setIsScanning(false);
          }} 
          onClose={() => setIsScanning(false)} 
        />
      )}
    </div>
  );
};

export default POS;
