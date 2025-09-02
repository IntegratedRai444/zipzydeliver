import bcrypt from 'bcryptjs';
import { LocalMongoDBStorage } from './storage-local-mongodb';

// Test user data
const TEST_USER = {
  id: 'gf202455815',
  email: 'rishabh.kapoor@test.com',
  firstName: 'Rishabh',
  lastName: 'Kapoor',
  phone: '8091273304',
  studentId: 'gf202455815',
  college: 'Shoolini University',
  hostel: 'GHS Boys Aryabhatta',
  role: 'user'
};

const TEST_ADMIN = {
  id: 'admin-1756623849620',
  email: 'rishabhkapoor@atomicmail.io',
  firstName: 'Rishabh',
  lastName: 'Kapoor',
  phone: '8091273304',
  studentId: 'gf202455815',
  college: 'Shoolini University',
  hostel: 'GHS Boys Aryabhatta',
  role: 'admin',
  isAdmin: true
};

export async function createTestUsers(storage: LocalMongoDBStorage) {
  try {
    // Clear existing test users first to ensure clean data
    try {
      await storage.clearTestUsers();
      console.log('🧹 Cleared existing test users');
    } catch (error) {
      console.log('⚠️ Could not clear test users:', error);
    }
    
    // Create test user
    const existingUser = await storage.getUserByEmail(TEST_USER.email);
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('test123', 10);
      
      const newUser = await storage.createUser({
        id: TEST_USER.id,
        email: TEST_USER.email,
        firstName: TEST_USER.firstName,
        lastName: TEST_USER.lastName,
        phone: TEST_USER.phone,
        address: TEST_USER.hostel,
        role: TEST_USER.role,
        isAdmin: false
      });

      await storage.createUserCredential({
        userId: TEST_USER.id,
        email: TEST_USER.email,
        passwordHash: hashedPassword
      });

      console.log('✅ Test user created:', TEST_USER.email);
    }

    // Create test admin
    const existingAdmin = await storage.getUserByEmail(TEST_ADMIN.email);
    if (!existingAdmin) {
      const defaultAdminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Rishabhkapoor@0444';
      const hashedPassword = await bcrypt.hash(defaultAdminPassword, 10);
      
      const newAdmin = await storage.createUser({
        id: TEST_ADMIN.id,
        email: TEST_ADMIN.email,
        firstName: TEST_ADMIN.firstName,
        lastName: TEST_ADMIN.lastName,
        phone: TEST_ADMIN.phone,
        address: TEST_ADMIN.hostel,
        role: TEST_ADMIN.role,
        isAdmin: true
      });

      await storage.createUserCredential({
        userId: TEST_ADMIN.id,
        email: TEST_ADMIN.email,
        passwordHash: hashedPassword
      });

      console.log('✅ Test admin created:', TEST_ADMIN.email);
    }

    return { success: true, message: 'Test users ready' };
  } catch (error) {
    console.error('❌ Error creating test users:', error);
    return { success: false, error: (error as Error).message };
  }
}

export function getTestUserInfo() {
  return {
    user: TEST_USER,
    admin: TEST_ADMIN,
    credentials: {
      user: { email: TEST_USER.email, password: 'test123' },
      admin: { email: TEST_ADMIN.email, password: 'Rishabhkapoor@0444' }
    }
  };
}
