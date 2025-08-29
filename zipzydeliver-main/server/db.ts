import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "@shared/schema";
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env file manually
config({ path: resolve(process.cwd(), '.env') });

// For development, use a mock database if no DATABASE_URL is set
let db: any;

if (!process.env.DATABASE_URL) {
  console.log('⚠️ No DATABASE_URL found, using mock database for development');
  // Create a mock database object
  db = {
    // Add mock methods as needed
    query: () => Promise.resolve([]),
    insert: () => Promise.resolve({}),
    update: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
  };
} else {
  // Configure to ignore SSL certificate issues for development
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  // Use HTTP connection instead of WebSocket to avoid SSL issues
  const sql = neon(process.env.DATABASE_URL, {
    fetchOptions: {
      cache: 'no-store',
    },
  });

  db = drizzle(sql, { schema });
}

export { db };