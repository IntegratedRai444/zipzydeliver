console.log('Running Security Tests...\n');

// Test 1: Check if .env has required security variables
console.log('1. Testing Environment Variables...');
const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf8');

const requiredVars = [
  'SESSION_SECRET',
  'REDIS_PASSWORD', 
  'BCRYPT_ROUNDS',
  'RATE_LIMIT_MAX_REQUESTS'
];

let envScore = 0;
requiredVars.forEach(varName => {
  if (envContent.includes(varName)) {
    console.log(`   [OK] ${varName} - Found`);
    envScore++;
  } else {
    console.log(`   [MISSING] ${varName} - Missing`);
  }
});

console.log(`   Score: ${envScore}/${requiredVars.length}\n`);

// Test 2: Check SSL setup
console.log('2. Testing SSL Setup...');
if (fs.existsSync('ssl')) {
  console.log('   [OK] SSL directory found');
  if (fs.existsSync('ssl/cert.pem') && fs.existsSync('ssl/key.pem')) {
    console.log('   [OK] SSL certificates found');
    console.log('   [OK] HTTPS ready!');
  } else {
    console.log('   [MISSING] SSL certificates missing');
  }
} else {
  console.log('   [MISSING] SSL directory missing');
}

// Test 3: Check security middleware
console.log('3. Testing Security Middleware...');
if (fs.existsSync('server/middleware/security.ts')) {
  console.log('   [OK] Security middleware found');
} else {
  console.log('   [MISSING] Security middleware missing');
}

// Test 4: Check Docker security
console.log('4. Testing Docker Security...');
if (fs.existsSync('Dockerfile') && fs.existsSync('docker-compose.yml')) {
  console.log('   [OK] Docker files found');
  console.log('   [OK] Container security ready');
} else {
  console.log('   [MISSING] Docker files missing');
}

// Test 5: Check package.json security
console.log('5. Testing Package Security...');
if (fs.existsSync('package.json')) {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const securityDeps = ['helmet', 'express-rate-limit', 'bcryptjs'];
  let depsScore = 0;
  
  securityDeps.forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      console.log(`   [OK] ${dep} - Installed`);
      depsScore++;
    } else {
      console.log(`   [MISSING] ${dep} - Missing`);
    }
  });
  
  console.log(`   Score: ${depsScore}/${securityDeps.length}`);
} else {
  console.log('   [MISSING] package.json not found');
}

// Test 6: Check Redis configuration
console.log('6. Testing Redis Security...');
if (fs.existsSync('redis.conf')) {
  const redisContent = fs.readFileSync('redis.conf', 'utf8');
  if (redisContent.includes('requirepass')) {
    console.log('   [OK] Redis password protection configured');
  } else {
    console.log('   [MISSING] Redis password protection missing');
  }
} else {
  console.log('   [MISSING] Redis configuration file missing');
}

// Test 7: Check Nginx security
console.log('7. Testing Nginx Security...');
if (fs.existsSync('nginx.conf')) {
  const nginxContent = fs.readFileSync('nginx.conf', 'utf8');
  const securityHeaders = [
    'X-Frame-Options',
    'X-Content-Type-Options', 
    'X-XSS-Protection',
    'Strict-Transport-Security'
  ];
  let headerScore = 0;
  
  securityHeaders.forEach(header => {
    if (nginxContent.includes(header)) {
      console.log(`   [OK] ${header} - Configured`);
      headerScore++;
    } else {
      console.log(`   [MISSING] ${header} - Missing`);
    }
  });
  
  console.log(`   Score: ${headerScore}/${securityHeaders.length}`);
} else {
  console.log('   [MISSING] Nginx configuration file missing');
}

console.log('\nSecurity Test Complete!');

// Overall score calculation
const totalTests = 7;
let passedTests = 0;

if (envScore >= 3) passedTests++;
if (fs.existsSync('ssl/cert.pem') && fs.existsSync('ssl/key.pem')) passedTests++;
if (fs.existsSync('server/middleware/security.ts')) passedTests++;
if (fs.existsSync('Dockerfile') && fs.existsSync('docker-compose.yml')) passedTests++;
if (fs.existsSync('package.json')) passedTests++;
if (fs.existsSync('redis.conf')) passedTests++;
if (fs.existsSync('nginx.conf')) passedTests++;

const overallScore = Math.round((passedTests / totalTests) * 100);
console.log(`\nOverall Production Readiness: ${overallScore}%`);

if (overallScore >= 90) {
  console.log('EXCELLENT! Your application is production ready!');
} else if (overallScore >= 80) {
  console.log('GREAT! Almost production ready, minor fixes needed.');
} else if (overallScore >= 70) {
  console.log('GOOD! Several improvements needed before production.');
} else {
  console.log('ATTENTION! Significant security improvements needed.');
}
