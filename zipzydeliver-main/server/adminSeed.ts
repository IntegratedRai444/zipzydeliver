import { storage } from './storage';

// Seed a single admin user with email/password if not exists.
// Password is stored as salted PBKDF2 hash; plaintext is never persisted.
export async function ensureAdminUser(options: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}) {
  try {
    const existing = await (storage as any).getUserByEmail?.(options.email);
    if (existing && existing.isAdmin) {
      return existing;
    }

    const crypto = await import('node:crypto');
    const salt = crypto.randomBytes(16).toString('hex');
    const derived = await new Promise<string>((resolve, reject) => {
      crypto.pbkdf2(options.password, salt, 310000, 32, 'sha256', (err, dk) => {
        if (err) reject(err); else resolve(dk.toString('hex'));
      });
    });
    const hash = `${salt}:${derived}`;

    // Create or update the user as admin
    const user = await storage.upsertUser({
      id: existing?.id,
      email: options.email,
      firstName: options.firstName || 'Admin',
      lastName: options.lastName || '',
      isAdmin: true,
    } as any);

    // Ensure credentials row exists/updated
    const creds = await (storage as any).getUserCredentialsByEmail?.(options.email);
    if (!creds) {
      await (storage as any).createUserCredentials?.({ userId: user.id, email: options.email, passwordHash: hash });
    }
    return user;
  } catch (err) {
    console.error('Failed to ensure admin user:', err);
    return undefined;
  }
}


