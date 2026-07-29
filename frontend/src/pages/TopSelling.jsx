import React from 'react';
import { TrendingUp } from 'lucide-react';

const TopSelling = ({ inventory }) => {
  const topSellingItems = [...inventory].sort((a, b) => b.sold - a.sold).slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Top Selling Items</h2>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 bg-green-600">
          <h3 className="text-xl font-semibold text-white flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Best Performing Products
          </h3>
        </div>
        <div className="p-6">
          {topSellingItems.map((item, index) => (
            <div key={item._id} className="flex items-center justify-between py-4 border-b border-gray-200 last:border-0">
              <div className="flex items-center space-x-4">
                <div className="bg-green-100 text-green-600 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg">
                  {index + 1}
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-lg">{item.name}</p>
                  <p className="text-sm text-gray-600">{item.category}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-800 text-lg">{item.sold} sold</p>
                <p className="text-sm text-green-600 font-semibold">Revenue: ₱{(item.sold * item.price).toLocaleString()}</p>
                <p className="text-xs text-gray-500">Stock: {item.quantity} units</p>
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <p className="text-gray-700 font-semibold">Total Revenue from Top 5:</p>
            <p className="text-2xl font-bold text-green-600">
              ₱{topSellingItems.reduce((sum, item) => sum + (item.sold * item.price), 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopSelling;
