const path = require('path');

// Load environment variables from prod.env
require('dotenv').config({ path: path.join(__dirname, 'prod.env') });

// Check if prod.env exists and has required variables
if (!process.env.MAIN_API_KEY || !process.env.UPLOAD_API_KEY) {
  console.error('❌ ERROR: prod.env file not found or missing required variables!');
  console.error('📝 Please create prod.env from example.env and configure your API keys');
  console.error('   cp example.env prod.env');
  console.error('   nano prod.env');
  process.exit(1);
}

module.exports = {
  // API Keys from environment variables
  MAIN_API_KEY: process.env.MAIN_API_KEY,
  UPLOAD_API_KEY: process.env.UPLOAD_API_KEY,
  
  // Server Configuration
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'production',
  
  // Storage Configuration
  STORAGE_PATH: process.env.STORAGE_PATH || './storage',
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || '100MB',
};
