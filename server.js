const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
require('dotenv').config();

// Import MongoDB connection
const connectDB = require('./config/database');
const seedDatabase = require('./config/seed');

// Import routes
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const reportRoutes = require('./routes/reportRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const responseRoutes = require('./routes/responseRoutes');
const auditRoutes = require('./routes/auditRoutes');
const alertRoutes = require('./routes/alertRoutes');
const garageRoutes = require('./routes/garageRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ========================================
// CONNECT TO MONGODB
// ========================================
connectDB().then(() => {
  seedDatabase();
});

// ========================================
// MIDDLEWARE
// ========================================
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Log request information (simple local logging)
app.use((req, res, next) => {
  console.log(`[API REQUEST] ${req.method} ${req.url}`);
  next();
});

// ========================================
// MOUNTING ROUTES
// ========================================
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/response', responseRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/garages', garageRoutes);

// ========================================
// HEALTH CHECK ENDPOINTS
// ========================================

// Basic health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Detailed health check with MongoDB status
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'Disconnected ❌',
    1: 'Connected ✅',
    2: 'Connecting ⏳',
    3: 'Disconnecting ⏳'
  };

  res.json({
    status: 'OK',
    message: 'MOT Reminder API is running',
    server: {
      port: PORT,
      environment: process.env.NODE_ENV || 'development'
    },
    database: {
      status: dbStatusMap[dbStatus] || 'Unknown',
      connected: dbStatus === 1,
      name: mongoose.connection.name || 'Not connected',
      host: mongoose.connection.host || 'Not connected'
    },
    timestamp: new Date().toISOString()
  });
});

// ========================================
// ERROR HANDLING MIDDLEWARE
// ========================================

// 404 Not Found handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: errors
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `Duplicate value for ${field}. Please use a unique value.`
    });
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token. Please login again.'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error occurred.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ========================================
// START SERVER
// ========================================

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`  MOT Reminder System Backend Server Started!  `);
  console.log(`  Listening on Port: http://localhost:${PORT}   `);
  console.log(`  Health Check: http://localhost:${PORT}/api/health`);
  console.log(`===============================================`);
});

module.exports = app; // For testing