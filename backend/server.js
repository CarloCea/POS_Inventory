require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.set('trust proxy', 1);

// CORS configuration to allow Vercel, localhost, and all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Fallback manual CORS headers on all requests (also answers OPTIONS preflight)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Routes
const inventoryRoutes = require('./routes/inventory');
const posRoutes = require('./routes/pos');
const dashboardRoutes = require('./routes/dashboard');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const adjustmentsRoutes = require('./routes/adjustments');

app.use('/api/inventory', inventoryRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/adjustments', adjustmentsRoutes);

// Health check / root
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'connecting_or_disconnected',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend in production (only if frontend build directory exists locally)
const frontendBuildPath = path.join(__dirname, '../frontend/build');

if (process.env.NODE_ENV === 'production' && fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
  app.use((req, res) => {
    res.sendFile(path.resolve(frontendBuildPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({ status: 'API is running', environment: process.env.NODE_ENV || 'development' });
  });
}

// Global error handler that preserves CORS headers
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.header('Access-Control-Allow-Origin', '*');
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});

// Bind port immediately so Render / cloud host detects port binding without waiting on DB
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sari-sari';
const { checkAndLogExpiredBatches } = require('./utils/batchUtils');

mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 8000,
  connectTimeoutMS: 10000,
})
  .then(() => {
    console.log('Connected to MongoDB');
    // Run automated expiration check in background
    checkAndLogExpiredBatches().catch(err => console.error('Startup batch audit error:', err));
    // Schedule periodic expiration check every hour
    setInterval(() => {
      checkAndLogExpiredBatches().catch(err => console.error('Scheduled batch audit error:', err));
    }, 60 * 60 * 1000);
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err.message);
  });
