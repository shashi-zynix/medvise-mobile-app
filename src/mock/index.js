// Mock Node.js backend for MedviseApp
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Get API domain from environment variables
const getApiDomain = () => {
  const apiUrl = process.env.API_BASE_URL_DEVELOPMENT || 'https://testapi.medvise.ai';
  return apiUrl.replace(/^https?:\/\//, '');
};

// Get portal domain from API domain
const getPortalDomain = () => {
  const apiDomain = getApiDomain();
  return apiDomain.replace('testapi', 'www.testportal');
};

// Import logger (CommonJS import for Node.js environment)
// Note: This assumes the logger can be used in Node.js environment
// You might need to create a separate logger for Node.js
const logger = {
  info: (message, data) => {
    const timestamp = new Date().toISOString();
    console.info(`[${timestamp}] [INFO] ${message}`, data || '');
  },
  debug: (message, data) => {
    const timestamp = new Date().toISOString();
    console.debug(`[${timestamp}] [DEBUG] ${message}`, data || '');
  },
  error: (message, data) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] ${message}`, data || '');
  },
  group: (title, callback) => {
    console.group(title);
    callback();
    console.groupEnd();
  }
};

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3001;

// Body parsing middleware - must be before any routes
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Custom CORS middleware to set exact headers
app.use((req, res, next) => {
  const portalDomain = getPortalDomain();
  res.header('Access-Control-Allow-Origin', `https://${portalDomain}`);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRFToken, accept');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.header('Allow', 'POST, OPTIONS');
    return res.status(204).send();
  }
  next();
});

// Logging middleware
app.use((req, res, next) => {
  // Log request details together
  logger.group(`Request: ${req.method} ${req.url}`, () => {
    logger.info(`${req.method} ${req.url}`);
    if (req.body && Object.keys(req.body).length > 0) {
      logger.debug('Request body', req.body);
    }
  });
  next();
});

// Mock login endpoint
app.post('/api/V2/account/auth/login/', (req, res) => {
  // Log received request
  logger.info('Login request received', req.body);

  // Basic validation - with safer destructuring
  const { email, password } = req.body || {};
  
  if (!email || !password) {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'Email and password are required'
    });
  }
  
  // Generate current date for headers
  const currentDate = new Date().toUTCString();
  const requestId = uuidv4().replace(/-/g, '');
  
  // Set specific headers as required
  res.setHeader('Allow', 'POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Date', currentDate);
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Server', 'nginx');
  
  // Set cookies as specified
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  
  const twoWeeksLater = new Date();
  twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
  
  // Get base domain for cookies
  const baseDomain = getApiDomain().split('.').slice(-2).join('.');
  
  res.setHeader('Set-Cookie', [
    `csrftoken=hI1MO3V6JpA5IB9XGFODkopc8MB9qciV; Domain=.${baseDomain}; expires=${nextYear.toUTCString()}; Max-Age=31449600; Path=/; SameSite=None; Secure`,
    `sessionid=avb6t8d24mj4xfc6wz5uduku8d00llq5; Domain=.${baseDomain}; expires=${twoWeeksLater.toUTCString()}; Max-Age=1209600; Path=/; SameSite=None; Secure`
  ]);
  
  res.setHeader('Vary', 'Accept, Cookie, Origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Request-Id', requestId);
  
  // Hardcoded response matching the specified format
  const mockResponse = {
    "user_id": 266,
    "practitioner_id": 63,
    "practitioner_role": "doctor",
    "first_name": "Shashikumar",
    "last_name": "Mamadapur",
    "timezone": "UTC",
    "language": "en",
    "has_accepted_terms": true,
    "settings": {},
    "is_emr_linked": false,
    "emr_system_details": {
      "id": 1,
      "emr_name": "eClinicalWorks",
      "emr_version": "v12",
      "emr_verbose_name": "eClinicalWorks",
      "emr_code": "eClinicalWorks_v12"
    },
    "speciality": "CARDIOLOGY",
    "email": "shashi@zynix.ai",
    "license_number": "123456789"
  };
  
  // Send the mock response
  res.status(200).json(mockResponse);
});

// Default route
app.get('/', (req, res) => {
  res.json({
    message: 'MedviseApp Mock API Server',
    status: 'running',
    endpoints: [
      'POST /api/V2/account/auth/login/'
    ]
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `The requested endpoint ${req.method} ${req.url} does not exist`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Server Error', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred'
  });
});

// Start server
app.listen(PORT, () => {
  logger.group('Server Started', () => {
    logger.info(`Mock API server running on port ${PORT}`);
    logger.info(`Access the server at http://localhost:${PORT}`);
  });
});