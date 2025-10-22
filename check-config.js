#!/usr/bin/env node

// xCloud Storage - Configuration Checker
// Проверка конфигурации и API ключей

const path = require('path');

console.log('🔍 xCloud Storage - Configuration Check');
console.log('=====================================');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, 'prod.env'), override: true });

console.log('📁 prod.env file path:', path.join(__dirname, 'prod.env'));
console.log('📄 prod.env exists:', require('fs').existsSync(path.join(__dirname, 'prod.env')));

console.log('');
console.log('🔑 Environment Variables:');
console.log('MAIN_API_KEY:', process.env.MAIN_API_KEY || 'NOT SET');
console.log('UPLOAD_API_KEY:', process.env.UPLOAD_API_KEY || 'NOT SET');
console.log('PORT:', process.env.PORT || 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
console.log('STORAGE_PATH:', process.env.STORAGE_PATH || 'NOT SET');
console.log('MAX_FILE_SIZE:', process.env.MAX_FILE_SIZE || 'NOT SET');

console.log('');
console.log('📋 Loaded Configuration:');

try {
  const config = require('./config.js');
  console.log('MAIN_API_KEY:', config.MAIN_API_KEY);
  console.log('UPLOAD_API_KEY:', config.UPLOAD_API_KEY);
  console.log('PORT:', config.PORT);
  console.log('NODE_ENV:', config.NODE_ENV);
  console.log('STORAGE_PATH:', config.STORAGE_PATH);
  console.log('MAX_FILE_SIZE:', config.MAX_FILE_SIZE);
} catch (error) {
  console.error('❌ Error loading config:', error.message);
}

console.log('');
console.log('✅ Configuration check complete');
