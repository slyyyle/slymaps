const http = require('http');

// Test if the page loads without errors
const options = {
  hostname: 'localhost',
  port: 9002,
  path: '/',
  method: 'GET',
};

const req = http.request(options, (res) => {
  console.log(`✅ Status Code: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    // Check if the page contains the error message
    if (data.includes('The result of getServerSnapshot should be cached')) {
      console.log('❌ ERROR: Infinite loop error still present!');
      process.exit(1);
    } else if (data.includes('<!DOCTYPE html>')) {
      console.log('✅ Page loaded successfully without infinite loop error!');
      console.log('✅ The fix has resolved the issue.');
      process.exit(0);
    } else {
      console.log('⚠️  Unexpected response');
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error);
  process.exit(1);
});

req.end(); 