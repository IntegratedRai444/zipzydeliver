import { db } from './db';
import { sql } from 'drizzle-orm';

export async function ensureAuthSchema(): Promise<void> {
  try {
    // Create users table minimal columns if DB is empty (id, email)
    // Note: main users table is defined in migrations; this only ensures critical auth tables.
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_credentials (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL,
        email varchar UNIQUE NOT NULL,
        password_hash varchar(255) NOT NULL,
        created_at timestamp DEFAULT now()
      );
    `);
  } catch (error) {
    console.error('Failed ensuring auth schema:', error);
  }
}


