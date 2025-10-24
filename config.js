const path = require('path');

// Force reload environment variables from Important_files/prod.env
delete require.cache[require.resolve('dotenv')];

// Try Important_files/prod.env first, then fallback to prod.env symlink
const importantFilesEnv = path.join(__dirname, 'Important_files', 'prod.env');
const symlinkEnv = path.join(__dirname, 'prod.env');

if (require('fs').existsSync(importantFilesEnv)) {
  require('dotenv').config({ path: importantFilesEnv, override: true });
} else if (require('fs').existsSync(symlinkEnv)) {
  require('dotenv').config({ path: symlinkEnv, override: true });
} else {
  console.error('❌ ERROR: Neither Important_files/prod.env nor prod.env symlink found!');
  process.exit(1);
}

// Check if prod.env exists and has required variables
if (!process.env.MAIN_API_KEY || !process.env.UPLOAD_API_KEY) {
  console.error('❌ ERROR: prod.env file not found or missing required variables!');
  console.error('📝 Please create prod.env in Important_files directory and configure your API keys');
  console.error('   mkdir -p Important_files');
  console.error('   cp example.env Important_files/prod.env');
  console.error('   nano Important_files/prod.env');
  console.error('   # Or create symlink: ln -s Important_files/prod.env prod.env');
  console.error('');
  console.error('Current environment variables:');
  console.error('MAIN_API_KEY:', process.env.MAIN_API_KEY);
  console.error('UPLOAD_API_KEY:', process.env.UPLOAD_API_KEY);
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
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || '500MB',
};
