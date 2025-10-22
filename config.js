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
  
  // S3 Configuration (optional)
  AWS: {
    ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || 'your_aws_key345987398475983745',
    SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || 'your_aws_secret345876343784658',
    REGION: process.env.AWS_REGION || 'us-east-1',
    BUCKET: process.env.S3_BUCKET || 'your-bucket-name'
  }
};
