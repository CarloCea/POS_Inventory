import React, { useEffect, useState } from 'react';
import { getDashboardStats } from '../api';
import { TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalProfit: 0,
    lowStockItems: 0,
    topSellingProducts: [],
    chartData: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const years = Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-full py-20 text-gray-500">Loading Dashboard...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Sales</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">₱{stats.totalSales.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Profit</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">₱{stats.totalProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">Low Stock Items</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.lowStockItems}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-full">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Line Chart */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
              <span>Sales Overview for</span>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 ml-2 font-semibold"
              >
                {months.map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 ml-2 font-semibold"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </h3>
          </div>
          <div className="h-80">
            {stats.chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400">No sales data available yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(() => {
                  const currentMonthData = stats.chartData.filter(d => {
                    const date = new Date(d.date);
                    // Ensure the date is valid before comparing months and years
                    return !isNaN(date.getTime()) && date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
                  });
                  
                  const weeklyData = [
                    { name: 'Week 1', sales: 0, profit: 0 },
                    { name: 'Week 2', sales: 0, profit: 0 },
                    { name: 'Week 3', sales: 0, profit: 0 },
                    { name: 'Week 4', sales: 0, profit: 0 }
                  ];

                  currentMonthData.forEach(d => {
                    const day = new Date(d.date).getDate();
                    let weekIndex = 0;
                    if (day > 7 && day <= 14) weekIndex = 1;
                    else if (day > 14 && day <= 21) weekIndex = 2;
                    else if (day > 21) weekIndex = 3;
                    
                    weeklyData[weekIndex].sales += d.sales;
                    weeklyData[weekIndex].profit += d.profit;
                  });
                  return weeklyData;
                })()} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis 
                    allowDecimals={false}
                    domain={[0, dataMax => Math.max(Math.ceil(dataMax / 10) * 10, 10)]}
                  />
                  <RechartsTooltip formatter={(value) => `₱${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="sales" name="Sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Top Selling Products</h3>
          <div className="h-80">
            {stats.topSellingProducts.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400">No data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.topSellingProducts}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.topSellingProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
