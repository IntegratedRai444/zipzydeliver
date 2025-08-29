import http from 'http';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Test server is working!');
});

const port = 5000;
console.log(`Starting test server on port ${port}...`);

server.listen(port, '0.0.0.0', () => {
  console.log(`✅ Test server is running on port ${port}`);
  console.log(`📍 Local: http://localhost:${port}`);
  
  // Test if port is actually accessible
  setTimeout(() => {
    const testServer = http.createServer();
    testServer.listen(port, 'localhost', () => {
      testServer.close();
      console.log(`✅ Port ${port} is confirmed accessible`);
    });
    testServer.on('error', (error) => {
      console.log(`❌ Port ${port} is NOT accessible: ${error.message}`);
    });
  }, 1000);
});

server.on('error', (error) => {
  console.log(`❌ Server failed to start: ${error.message}`);
  if (error.code === 'EADDRINUSE') {
    console.log(`💡 Port ${port} is busy`);
  }
});
