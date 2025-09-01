import { getAvailablePort } from './portUtils';

/**
 * Smart Port Manager for ZipzyDeliver
 * Automatically handles port conflicts and provides fallback options
 */
export class SmartPortManager {
  private static instance: SmartPortManager;
  private reservedPorts: Map<string, number> = new Map();
  private portReservations: Map<number, () => void> = new Map();

  static getInstance(): SmartPortManager {
    if (!SmartPortManager.instance) {
      SmartPortManager.instance = new SmartPortManager();
    }
    return SmartPortManager.instance;
  }

  /**
   * Get all required ports for the application
   */
  async getAllPorts(): Promise<{
    server: number;
    hmr: number;
    websocket: number;
    api: number;
  }> {
    try {
      // Get ports in priority order
      const [server, hmr, websocket, api] = await Promise.all([
        this.getServerPort(),
        this.getHMRPort(),
        this.getWebSocketPort(),
        this.getAPIPort()
      ]);

      return { server, hmr, websocket, api };
    } catch (error) {
      console.error('Failed to get all ports:', error);
      throw error;
    }
  }

  /**
   * Get server port (frontend)
   */
  async getServerPort(): Promise<number> {
    const port = await getAvailablePort(3000, 3010);
    this.reservedPorts.set('server', port);
    return port;
  }

  /**
   * Get HMR port (Hot Module Replacement)
   */
  async getHMRPort(): Promise<number> {
    const port = await getAvailablePort(24679, 24689);
    this.reservedPorts.set('hmr', port);
    return port;
  }

  /**
   * Get WebSocket port
   */
  async getWebSocketPort(): Promise<number> {
    const port = await getAvailablePort(24678, 24688);
    this.reservedPorts.set('websocket', port);
    return port;
  }

  /**
   * Get API port (backend)
   */
  async getAPIPort(): Promise<number> {
    const port = await getAvailablePort(5000, 5010);
    this.reservedPorts.set('api', port);
    return port;
  }

  /**
   * Reserve a port to prevent conflicts
   */
  async reservePort(service: string, port: number): Promise<void> {
    if (this.portReservations.has(port)) {
      console.warn(`Port ${port} is already reserved`);
      return;
    }

    // Create a temporary server to hold the port
    const { createServer } = await import('net');
    const server = createServer();
    
    server.listen(port, () => {
      console.log(`🔒 Reserved port ${port} for ${service}`);
    });

    this.portReservations.set(port, () => {
      server.close();
      console.log(`🔓 Released port ${port} from ${service}`);
    });
  }

  /**
   * Release all reserved ports
   */
  releaseAllPorts(): void {
    this.portReservations.forEach((release, port) => {
      release();
    });
    this.portReservations.clear();
    this.reservedPorts.clear();
  }

  /**
   * Get port summary
   */
  getPortSummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    this.reservedPorts.forEach((port, service) => {
      summary[service] = port;
    });
    return summary;
  }

  /**
   * Check if all required ports are available
   */
  async validatePorts(): Promise<boolean> {
    try {
      const ports = await this.getAllPorts();
      console.log('✅ All ports validated successfully:', ports);
      return true;
    } catch (error) {
      console.error('❌ Port validation failed:', error);
      return false;
    }
  }

  /**
   * Get alternative ports if preferred ones are unavailable
   */
  async getAlternativePorts(): Promise<{
    server: number[];
    hmr: number[];
    websocket: number[];
    api: number[];
  }> {
    const alternatives = {
      server: await this.getAlternativePortsForRange(3000, 3010, 5),
      hmr: await this.getAlternativePortsForRange(24679, 24689, 5),
      websocket: await this.getAlternativePortsForRange(24678, 24688, 5),
      api: await this.getAlternativePortsForRange(5000, 5010, 5)
    };

    return alternatives;
  }

  /**
   * Get alternative ports for a specific range
   */
  private async getAlternativePortsForRange(start: number, end: number, count: number): Promise<number[]> {
    const ports: number[] = [];
    const { isPortAvailable } = await import('./portUtils');

    for (let port = start; port <= end && ports.length < count; port++) {
      if (await isPortAvailable(port)) {
        ports.push(port);
      }
    }

    return ports;
  }
}

/**
 * Global port manager instance
 */
export const portManager = SmartPortManager.getInstance();

/**
 * Utility function to get ports with fallback
 */
export async function getPortsWithFallback(): Promise<{
  server: number;
  hmr: number;
  websocket: number;
  api: number;
}> {
  try {
    return await portManager.getAllPorts();
  } catch (error) {
    console.warn('Primary port selection failed, using fallback ports...');
    
    // Use fallback ports
    const fallbackPorts = {
      server: 8080,
      hmr: 24690,
      websocket: 24691,
      api: 8081
    };

    console.log('Using fallback ports:', fallbackPorts);
    return fallbackPorts;
  }
}
