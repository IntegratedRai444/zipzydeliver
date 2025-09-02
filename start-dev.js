import { spawn } from 'child_process';
import { createServer } from 'net';

// Function to find an available port
async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + 20; port++) {
    const isAvailable = await new Promise((resolve) => {
      const server = createServer();
      server.listen(port, () => {
        server.close();
        resolve(true);
      });
      server.on('error', () => {
        resolve(false);
      });
    });
    if (isAvailable) {
      return port;
    }
  }
  throw new Error(`No available ports found starting from ${startPort}`);
}

async function startDev() {
  try {
    console.log('🚀 Starting Zipzy development servers...');
    
    // Find available backend port
    const backendPort = await findAvailablePort(5000);
    console.log(`✅ Backend will use port: ${backendPort}`);
    
    // Set environment variables
    process.env.BACKEND_PORT = backendPort.toString();
    process.env.BACKEND_URL = `http://localhost:${backendPort}`;
    
    // Start backend server
    const backend = spawn('npm', ['run', 'dev:backend'], {
      stdio: 'inherit',
      env: { ...process.env, PORT: backendPort.toString() }
    });
    
    // Wait a moment for backend to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Start frontend server
    const frontend = spawn('npm', ['run', 'dev:frontend'], {
      stdio: 'inherit',
      env: { ...process.env, BACKEND_URL: `http://localhost:${backendPort}` }
    });
    
    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down servers...');
      backend.kill();
      frontend.kill();
      process.exit(0);
    });
    
    // Handle backend exit
    backend.on('exit', (code) => {
      console.log(`❌ Backend server exited with code ${code}`);
      frontend.kill();
      process.exit(code);
    });
    
    // Handle frontend exit
    frontend.on('exit', (code) => {
      console.log(`❌ Frontend server exited with code ${code}`);
      backend.kill();
      process.exit(code);
    });
    
  } catch (error) {
    console.error('❌ Failed to start development servers:', error);
    process.exit(1);
  }
}

startDev();
