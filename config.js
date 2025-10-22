const path = require('path');

// Load environment variables from prod.env
require('dotenv').config({ path: path.join(__dirname, 'prod.env') });

module.exports = {
  // API Keys from environment variables
  MAIN_API_KEY: process.env.MAIN_API_KEY,
  UPLOAD_API_KEY: process.env.UPLOAD_API_KEY,
  
  // Server Configuration
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  
  // Storage Configuration
  STORAGE_PATH: process.env.STORAGE_PATH,
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE,
};
