import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { users } from '../shared/schema';

async function main() {
  const pgUrl = process.env.DATABASE_URL;
  const mongoUrl = process.env.MONGO_URL;
  const mongoDbName = process.env.MONGO_DB_NAME || 'zipzy';

  if (!pgUrl) throw new Error('DATABASE_URL is required');
  if (!mongoUrl) throw new Error('MONGO_URL is required');

  // Postgres connection
  const sql = neon(pgUrl, { fetchOptions: { cache: 'no-store' } });
  const db = drizzle(sql);

  // Mongo connection
  const client = new MongoClient(mongoUrl);
  await client.connect();
  const mdb = client.db(mongoDbName);
  const usersCol = mdb.collection('users');

  try {
    console.log('Reading users from Postgres...');
    const pgUsers = await db.select().from(users);
    console.log(`Found ${pgUsers.length} users`);

    if (pgUsers.length === 0) {
      console.log('No users to migrate.');
      return;
    }

    // Upsert users into Mongo, preserving id as _id and keeping all fields
    let migrated = 0;
    for (const u of pgUsers) {
      const {_ , ...rest} = (u as any);
      await usersCol.updateOne(
        { _id: u.id },
        {
          $set: {
            _id: u.id,
            email: u.email ?? null,
            firstName: u.firstName ?? null,
            lastName: u.lastName ?? null,
            profileImageUrl: u.profileImageUrl ?? null,
            collegeId: u.collegeId ?? null,
            studentId: u.studentId ?? null,
            department: u.department ?? null,
            hostelAddress: u.hostelAddress ?? null,
            phone: u.phone ?? null,
            isAdmin: u.isAdmin ?? false,
            createdAt: u.createdAt ?? new Date(),
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
      migrated += 1;
    }

    console.log(`Migrated ${migrated} users to MongoDB database '${mongoDbName}'.`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
