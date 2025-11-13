require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Import database
const pool = require('./config/database');
const { testConnection } = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const publicRoutes = require('./routes/public');
const bookingRoutes = require('./routes/bookings');
const customerRoutes = require('./routes/customers');
const contactsRoutes = require('./routes/contacts');
const employeeRoutes = require('./routes/employees');
const reportRoutes = require('./routes/reports');
const orderRoutes = require('./routes/orderRoutes');
const invoiceRoutes = require('./routes/invoices');

// New routes for court booking system
const courtRoutes = require('./routes/courts');
const availabilityRoutes = require('./routes/availability');
const timeFrameRoutes = require('./routes/timeFrames');
const shiftRoutes = require('./routes/shifts');
const serviceRoutes = require('./routes/services');

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : [
        'http://localhost:3000',
        'http://localhost:5173', // Vite dev server - customer
        'http://localhost:5174', // Vite dev server - admin
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
      ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['*'],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Higher limit for development
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
});
app.use(limiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // Higher limit for development
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.',
  },
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const dbResult = await pool.query(
      'SELECT NOW() as server_time, version() as pg_version'
    );
    res.json({
      success: true,
      message: 'Server is healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: true,
        server_time: dbResult.rows[0].server_time,
        postgresql_version: dbResult.rows[0].pg_version.split(',')[0],
      },
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Server health check failed',
      error: error.message,
      database: {
        connected: false,
      },
    });
  }
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/invoices', invoiceRoutes);

// New court booking system routes
app.use('/api/courts', courtRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/timeframes', timeFrameRoutes);
app.use('/api/shifts', shiftRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Pickleball Court Management API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      public: '/api/public',
      bookings: '/api/bookings',
      courts: '/api/courts',
      availability: '/api/availability',
      services: '/api/services',
      customers: '/api/customers',
      employees: '/api/employees',
      reports: '/api/reports',
      health: '/health',
    },
  });
});

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.message,
    });
  }

  if (error.code === '23505') {
    return res.status(400).json({
      success: false,
      message: 'Duplicate entry error',
    });
  }

  if (error.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Foreign key constraint error',
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : error.message,
  });
});

// Start server with database connection test
const startServer = async () => {
  try {
    console.log('🚀 Starting Buffet Restaurant Management Server...\n');

    // Test database connection first
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error('❌ Cannot start server: Database connection failed');
      console.log('\n📝 Please check:');
      console.log('   1. PostgreSQL service is running');
      console.log('   2. Database "buffet_restaurant" exists');
      console.log('   3. Database credentials in .env file are correct');
      console.log('   4. Database schema has been created');
      process.exit(1);
    }

    // Start HTTP server
    const server = app.listen(PORT, () => {
      console.log('\n🎉 Server started successfully!');
      console.log('═'.repeat(50));
      console.log(`🚀 Server running on port: ${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 API Base URL: http://localhost:${PORT}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`📖 API Documentation: http://localhost:${PORT}`);
      console.log('═'.repeat(50));
      console.log('\n📋 Available API endpoints:');
      // Schedule periodic cleanup job to cancel overdue pending bookings
    });

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the server
const server = startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received. Shutting down gracefully...');
  const serverInstance = await server;
  serverInstance.close(() => {
    console.log('✅ HTTP server closed');
    pool.end();
    console.log('✅ Database connections closed');
    console.log('👋 Process terminated gracefully');
  });
});

process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT received. Shutting down gracefully...');
  const serverInstance = await server;
  serverInstance.close(() => {
    console.log('✅ HTTP server closed');
    pool.end();
    console.log('✅ Database connections closed');
    console.log('👋 Process terminated gracefully');
  });
});

module.exports = app;
