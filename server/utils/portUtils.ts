import { createServer } from 'net';

export interface PortRange {
  start: number;
  end: number;
}

export const PORT_RANGES: PortRange[] = [
  { start: 5000, end: 5010 },    // Backend server
  { start: 3000, end: 3010 },    // Frontend dev server
  { start: 24678, end: 24688 },  // WebSocket server
  { start: 24679, end: 24689 },  // WebSocket HMR
];

export async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    
    server.listen(port, () => {
      server.close();
      resolve(true);
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}

export async function getAvailablePort(startPort: number, maxAttempts: number = 10): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available ports found starting from ${startPort}`);
}

export async function findPortInRange(range: PortRange): Promise<number> {
  return getAvailablePort(range.start, range.end - range.start + 1);
}

export async function getRandomAvailablePort(): Promise<number> {
  const randomRange = PORT_RANGES[Math.floor(Math.random() * PORT_RANGES.length)];
  return findPortInRange(randomRange);
}
