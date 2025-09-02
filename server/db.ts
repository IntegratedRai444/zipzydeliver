// MongoDB-based database interface
// Compatibility layer so services can call db.* and delegate to LocalMongoDBStorage
import { config } from 'dotenv';
import { resolve } from 'path';
import { LocalMongoDBStorage } from './storage-local-mongodb';

// Load .env file manually
config({ path: resolve(process.cwd(), '.env') });

// Create a singleton storage instance for compatibility usage
const storage = new LocalMongoDBStorage();

const db = {
  // Minimal surface used by services
  getProducts: () => storage.getProducts(),
  getProduct: (id: string) => storage.getProductById(id),
  getOrders: (userId?: string) => (userId ? storage.getOrdersByUser(userId) : storage.getOrders()),
  getOrder: (id: string) => storage.getOrderById(id),

  // Generic fallbacks kept for any legacy callers
  query: () => Promise.resolve([] as never[]),
  insert: () => Promise.resolve({} as Record<string, never>),
  update: () => Promise.resolve({} as Record<string, never>),
  delete: () => Promise.resolve({} as Record<string, never>)
};

export { db };