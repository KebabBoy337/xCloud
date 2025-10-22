module.exports = {
  // ⚠️ IMPORTANT: Change these keys before production deployment!
  // API Keys (hardcoded for development)
  MAIN_API_KEY: 'main_key_2024_secure_12345',
  UPLOAD_API_KEY: 'upload_key_2024_secure_67890',
  
  // Server Configuration
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'production',
  
  // Storage Configuration
  STORAGE_PATH: './storage',
  MAX_FILE_SIZE: '100MB',
  
};
