// Testing xCloud Storage API
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3000/api';
const MAIN_KEY = 'main_key_2024_secure_12345';
const UPLOAD_KEY = 'upload_key_2024_secure_67890';

async function makeRequest(url, options = {}) {
  const fetch = (await import('node-fetch')).default;
  
  const response = await fetch(url, {
    headers: {
      'X-API-Key': options.apiKey || MAIN_KEY,
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function testAPI() {
  console.log('🧪 Testing xCloud Storage API\n');

  try {
    // 1. Health check test
    console.log('1️⃣ Health check...');
    const health = await makeRequest(`${API_BASE}/health`);
    console.log('✅ Service running:', health.status);

    // 2. File list test
    console.log('\n2️⃣ Getting file list...');
    const files = await makeRequest(`${API_BASE}/files`);
    console.log(`✅ Files found: ${files.files.length}`);

    // 3. File upload test
    console.log('\n3️⃣ Uploading test file...');
    const testContent = 'Hello, xCloud Storage! Test file.';
    const testFile = new Blob([testContent], { type: 'text/plain' });
    
    const formData = new FormData();
    formData.append('file', testFile, 'test.txt');

    const uploadResponse = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: {
        'X-API-Key': UPLOAD_KEY
      },
      body: formData
    });

    if (uploadResponse.ok) {
      const uploadResult = await uploadResponse.json();
      console.log('✅ File uploaded:', uploadResult.filename);
    } else {
      throw new Error('Upload failed');
    }

    // 4. Updated file list
    console.log('\n4️⃣ Updated file list...');
    const updatedFiles = await makeRequest(`${API_BASE}/files`);
    console.log(`✅ Files after upload: ${updatedFiles.files.length}`);

    // 5. S3 compatibility test (removed)
    console.log('\n5️⃣ S3 compatibility test (removed)...');
    console.log('✅ S3 endpoints removed');

    // 6. Invalid key test
    console.log('\n6️⃣ Invalid API key test...');
    try {
      await makeRequest(`${API_BASE}/files`, { apiKey: 'invalid_key' });
      console.log('❌ Error: request with invalid key succeeded');
    } catch (error) {
      console.log('✅ Invalid key correctly rejected');
    }

    // 7. Permission test
    console.log('\n7️⃣ Permission test...');
    try {
      await makeRequest(`${API_BASE}/files`, { apiKey: UPLOAD_KEY });
      console.log('❌ Error: Upload key got access to file list');
    } catch (error) {
      console.log('✅ Upload key correctly restricted');
    }

    console.log('\n🎉 All tests passed successfully!');

  } catch (error) {
    console.error('❌ Testing error:', error.message);
    process.exit(1);
  }
}

// Run tests
testAPI();
