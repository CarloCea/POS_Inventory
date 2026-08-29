import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const getInventory = async () => {
  const response = await axios.get(`${API_URL}/inventory`);
  return response.data;
};

export const addProduct = async (productData) => {
  const response = await axios.post(`${API_URL}/inventory`, productData);
  return response.data;
};

export const restockProduct = async (productData) => {
  const response = await axios.post(`${API_URL}/inventory/restock`, productData);
  return response.data;
};

export const updateInventory = async (id, data) => {
  const response = await axios.put(`${API_URL}/inventory/${id}`, data);
  return response.data;
};

export const deleteProduct = async (id) => {
  const response = await axios.delete(`${API_URL}/inventory/${id}`);
  return response.data;
};

export const getAdjustments = async () => {
  const response = await axios.get(`${API_URL}/adjustments`);
  return response.data;
};

export const addAdjustment = async (adjustmentData) => {
  const response = await axios.post(`${API_URL}/adjustments`, adjustmentData);
  return response.data;
};

export const processCheckout = async (orderData) => {
  const response = await axios.post(`${API_URL}/pos/checkout`, orderData);
  return response.data;
};

export const getDashboardStats = async () => {
  const response = await axios.get(`${API_URL}/dashboard/stats`);
  return response.data;
};

export const getTransactions = async () => {
  const response = await axios.get(`${API_URL}/pos/transactions`);
  return response.data;
};

export const getTodaySales = async (cashier) => {
  const response = await axios.get(`${API_URL}/pos/sales/today`, { params: { cashier } });
  return response.data;
};

// Auth APIs
export const login = async (credentials) => {
  const response = await axios.post(`${API_URL}/auth/login`, credentials);
  return response.data;
};

export const forgotPassword = async (email) => {
  const response = await axios.post(`${API_URL}/auth/forgot-password`, { email });
  return response.data;
};

export const verifyOtp = async (data) => {
  const response = await axios.post(`${API_URL}/auth/verify-otp`, data);
  return response.data;
};

export const resetPassword = async (data) => {
  const response = await axios.post(`${API_URL}/auth/reset-password`, data);
  return response.data;
};

// User APIs
export const getUsers = async () => {
  const response = await axios.get(`${API_URL}/users`);
  return response.data;
};

export const createUser = async (userData) => {
  const response = await axios.post(`${API_URL}/users`, userData);
  return response.data;
};

export const updateUser = async (id, userData) => {
  const response = await axios.put(`${API_URL}/users/${id}`, userData);
  return response.data;
};

export const deleteUser = async (id) => {
  const response = await axios.delete(`${API_URL}/users/${id}`);
  return response.data;
};
