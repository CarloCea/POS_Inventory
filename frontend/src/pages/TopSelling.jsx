import React from 'react';
import { TrendingUp } from 'lucide-react';

const TopSelling = ({ inventory }) => {
  const topSellingItems = [...inventory].sort((a, b) => b.sold - a.sold).slice(0, 5);

  const currentMonthString = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Top Selling Items</h2>
        <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{currentMonthString}</span>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
            Best Performing Products
          </h3>
        </div>
        <div className="p-6">
          {topSellingItems.map((item, index) => (
            <div key={item._id} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-100 text-blue-700 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg">
                  {index + 1}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-lg">{item.name}</p>
                  <p className="text-sm text-gray-600">{item.category}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900 text-lg">{item.sold} sold</p>
                <p className="text-sm text-green-600 font-semibold">Revenue: ₱{(item.sold * item.price).toLocaleString()}</p>
                <p className="text-xs text-gray-500">Stock: {item.quantity} units</p>
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-6 bg-white border-t border-gray-100">
          <div className="flex justify-between items-center bg-blue-50 p-4 rounded-2xl border border-blue-100">
            <p className="text-gray-700 font-semibold">Total Revenue from Top 5:</p>
            <p className="text-2xl font-bold text-blue-600">
              ₱{topSellingItems.reduce((sum, item) => sum + (item.sold * item.price), 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopSelling;
