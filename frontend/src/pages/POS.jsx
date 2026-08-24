import React, { useState } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Printer, X, Receipt } from 'lucide-react';
import { processCheckout } from '../api';
import TransactionHistory from './TransactionHistory';

const POS = ({ inventory, fetchInventory, cashier, onSaleCompleted }) => {
  const [cart, setCart] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('checkout');
  
  const [cash, setCash] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const categories = ['All', ...new Set(inventory.map(i => i.category).filter(Boolean))];
  const filteredInventory = selectedCategory === 'All' ? inventory : inventory.filter(i => i.category === selectedCategory);

  const addToCart = (product) => {
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
      if (onSaleCompleted) onSaleCompleted();
      setShowReceipt(true);
    } catch (error) {
      console.error("Checkout failed", error);
      alert("Checkout failed. Check stock levels or backend connection.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:py-8 lg:h-[calc(100vh-80px)] flex flex-col gap-4 md:gap-6">
      
      {/* POS Sub-navigation */}
      <div className="flex space-x-4 border-b pb-2 shrink-0">
        <button 
          onClick={() => setActiveTab('checkout')}
          className={`font-semibold px-4 py-2 rounded-t-lg transition-colors ${activeTab === 'checkout' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Point of Sale
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`font-semibold px-4 py-2 rounded-t-lg transition-colors ${activeTab === 'history' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Transaction History
        </button>
      </div>

      {activeTab === 'checkout' ? (
        <div className="flex flex-col lg:flex-row gap-4 md:gap-6 flex-1 min-h-0">
          {/* Product List */}
          <div className="w-full lg:w-2/3 bg-white rounded-lg shadow flex flex-col h-[50vh] lg:h-full overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Products</h2>
              
              {/* Category Filter */}
              <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-hide">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
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

            <div className="p-2 sm:p-4 md:p-6 overflow-y-auto flex-1 grid grid-cols-4 gap-2 sm:gap-4 content-start">
              {filteredInventory.map(item => (
                <button
                  key={item._id}
                  onClick={() => addToCart(item)}
                  disabled={item.quantity === 0}
                  className={`p-1.5 sm:p-3 rounded-lg border transition-all flex flex-col h-full ${
                    item.quantity === 0 
                      ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60' 
                      : 'bg-white border-gray-200 hover:border-blue-500 hover:shadow-md'
                  }`}
                >
                  {item.image ? (
                    <>
                      <div className="w-full aspect-square mb-2 bg-gray-100 rounded-md overflow-hidden shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 flex flex-col justify-between w-full text-left">
                        <div>
                          <h3 className="font-semibold text-gray-800 text-[10px] sm:text-sm line-clamp-2 leading-tight">
                            {item.name} {item.netWeight && <span className="text-gray-500 font-normal">({item.netWeight})</span>}
                          </h3>
                          <p className="text-[9px] sm:text-xs text-gray-500 mt-0.5 truncate">{item.category}</p>
                        </div>
                        <div className="mt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-1">
                          <span className="font-bold text-blue-600 text-xs sm:text-sm">₱{item.totalCost?.toFixed(2) || (item.price + (item.profit||0)).toFixed(2)}</span>
                          <span className={`text-[8px] sm:text-[10px] px-1 py-0.5 rounded-sm sm:rounded-full ${item.quantity > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {item.quantity > 0 ? `${item.quantity} left` : 'Out'}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col justify-between w-full h-full min-h-[120px] sm:min-h-[150px]">
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-1 sm:p-2">
                        <h3 className="font-bold text-gray-800 text-sm sm:text-lg leading-tight line-clamp-3">
                          {item.name}
                        </h3>
                        <div className="flex flex-wrap justify-center gap-1 mt-2">
                          <span className="text-gray-500 font-medium text-[10px] sm:text-xs border border-gray-200 rounded-full px-2 py-0.5 bg-gray-50">{item.category}</span>
                          {item.netWeight && (
                            <span className="text-gray-500 font-medium text-[10px] sm:text-xs border border-gray-200 rounded-full px-2 py-0.5 bg-gray-50">{item.netWeight}</span>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-col sm:flex-row justify-between items-center w-full gap-1 border-t border-gray-100 pt-2">
                        <span className="font-bold text-blue-600 text-xs sm:text-sm">₱{item.totalCost?.toFixed(2) || (item.price + (item.profit||0)).toFixed(2)}</span>
                        <span className={`text-[8px] sm:text-[10px] px-1 py-0.5 rounded-sm sm:rounded-full ${item.quantity > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {item.quantity > 0 ? `${item.quantity} left` : 'Out'}
                        </span>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Cart/Checkout */}
          <div className="w-full lg:w-1/3 bg-white rounded-lg shadow flex flex-col min-h-[40vh] lg:h-full overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Current Order
              </h2>
              <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {cart.length} items
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <ShoppingCart className="w-12 h-12 mb-2 opacity-50" />
                  <p>Cart is empty</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item._id} className="flex justify-between items-center p-3 border rounded-lg bg-white shadow-sm">
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="font-semibold text-sm text-gray-800 truncate">
                        {item.name} {item.netWeight && <span className="text-gray-500 font-normal">({item.netWeight})</span>}
                      </h4>
                      <p className="text-blue-600 text-sm font-medium">₱{item.totalCost?.toFixed(2)}</p>
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
                      className="w-full pl-8 pr-3 py-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
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
                className={`w-full py-4 rounded-lg font-bold text-lg text-white transition-colors shadow-md ${
                  !canCheckout
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <Receipt className="w-5 h-5 mr-2" />
                Receipt
              </h3>
              <button onClick={() => setShowReceipt(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div id="receipt-content" className="p-6 bg-white flex-1 overflow-y-auto">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Sari-Sari Store</h2>
                <p className="text-sm text-gray-500">{new Date(lastOrder.date).toLocaleString()}</p>
                <p className="text-sm text-gray-500">Order #{lastOrder._id.slice(-6)}</p>
              </div>
              
              <div className="border-t border-b py-4 mb-4 space-y-3">
                {lastOrder.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <div>
                      <span className="font-medium text-gray-800">{item.quantity}x</span> {item.name} {item.netWeight ? `(${item.netWeight})` : ''}
                    </div>
                    <div className="text-gray-800 font-medium">₱{item.subtotal.toFixed(2)}</div>
                  </div>
                ))}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Total</span>
                  <span className="font-bold text-gray-900 text-lg">₱{lastOrder.totalSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Cash</span>
                  <span>₱{lastOrder.cashGiven.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Change</span>
                  <span>₱{lastOrder.change.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="mt-8 text-center text-sm text-gray-500 italic">
                Thank you for your purchase!
              </div>
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex space-x-3">
              <button 
                onClick={() => setShowReceipt(false)} 
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100"
              >
                Close
              </button>
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
                className="flex-1 flex justify-center items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
