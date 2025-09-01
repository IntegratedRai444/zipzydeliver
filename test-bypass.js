// Simple test script to verify bypass endpoints
import http from 'http';

const testEndpoints = [
  'http://localhost:5000/api/health',
  'http://localhost:5000/api/test/user-info',
  'http://localhost:5000/api/test/create-users'
];

async function testEndpoint(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ success: true, status: res.statusCode, data: json });
        } catch (e) {
          resolve({ success: false, status: res.statusCode, error: data });
        }
      });
    });
    
    req.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        resolve({ success: false, error: 'Server not running (ECONNREFUSED)' });
      } else {
        resolve({ success: false, error: err.message });
      }
    });
    
    req.setTimeout(3000, () => {
      req.destroy();
      resolve({ success: false, error: 'Timeout (3s)' });
    });
  });
}

async function runTests() {
  console.log('🧪 Testing Zipzy Deliver Bypass Endpoints...\n');
  
  for (const url of testEndpoints) {
    console.log(`🔍 Testing: ${url}`);
    const result = await testEndpoint(url);
    
    if (result.success) {
      console.log(`✅ Success (${result.status}): ${JSON.stringify(result.data).substring(0, 100)}...`);
    } else {
      console.log(`❌ Failed: ${result.error}`);
    }
    console.log('');
  }
  
  console.log('📋 Summary:');
  console.log('✅ If all tests pass: Your bypass should work perfectly!');
  console.log('❌ If any test fails: Check if server is running on port 5000');
  console.log('');
  console.log('🚀 To start everything:');
  console.log('   1. Run: npm run dev');
  console.log('   2. Open: quick-access.html');
  console.log('   3. Or run: open-all-tabs.bat');
  console.log('');
  console.log('🔧 Quick Start:');
  console.log('   npm run dev');
  console.log('   # Wait 10 seconds, then:');
  console.log('   node test-bypass.js');
}

runTests();
