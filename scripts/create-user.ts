import 'dotenv/config';
import * as readline from 'node:readline';
import { getDatabase, saveDatabase, hashPassword } from '../src/lib/db/store.ts';
import type { UserWithPassword, UserRole } from '../src/types/index.ts';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Promisify readline question
function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function main() {
  console.log('🔐 WorkPulse User Provisioning System');
  console.log('=====================================\n');

  try {
    // Get user details interactively
    const name = await question('Enter full name: ');
    if (!name.trim()) {
      console.error('❌ Error: Name is required');
      process.exit(1);
    }

    const email = await question('Enter email address: ');
    if (!email.trim()) {
      console.error('❌ Error: Email is required');
      process.exit(1);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error(`❌ Error: Invalid email format`);
      process.exit(1);
    }

    const password = await question('Enter password (min 8 characters): ');
    if (!password || password.length < 8) {
      console.error('❌ Error: Password must be at least 8 characters long');
      process.exit(1);
    }

    const roleInput = await question('Enter role (BOSS/MANAGER/EMPLOYEE): ');
    const role = roleInput.trim().toUpperCase() as UserRole;

    // Validate role
    if (!['BOSS', 'MANAGER', 'EMPLOYEE'].includes(role)) {
      console.error(`❌ Error: Invalid role "${roleInput}"`);
      console.log('Valid roles: BOSS, MANAGER, EMPLOYEE');
      process.exit(1);
    }

    console.log('\n📋 User Details:');
    console.log(`   Name:  ${name}`);
    console.log(`   Email: ${email}`);
    console.log(`   Role:  ${role}\n`);

    const confirm = await question('Create this user? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
      console.log('❌ User creation cancelled');
      process.exit(0);
    }

    console.log('\n⏳ Creating user...\n');

    const db = await getDatabase();
    
    // Check if user already exists
    const existingIndex = db.users.findIndex((u) => u.email.toLowerCase() === email.toLowerCase());
    const now = new Date().toISOString();

    if (existingIndex !== -1) {
      console.log('⚠️  User with this email already exists');
      const update = await question('Update existing user? (yes/no): ');
      
      if (update.toLowerCase() !== 'yes' && update.toLowerCase() !== 'y') {
        console.log('❌ User creation cancelled');
        process.exit(0);
      }
      
      console.log('   Updating existing user...\n');
      
      db.users[existingIndex].passwordHash = hashPassword(password);
      db.users[existingIndex].name = name.trim();
      db.users[existingIndex].role = role;
      db.users[existingIndex].isActive = true;
      db.users[existingIndex].updatedAt = now;
      
      await saveDatabase(db);
      
      console.log('✅ User updated successfully');
      console.log(`   ID: ${db.users[existingIndex].id}`);
    } else {
      const newUser: UserWithPassword = {
        id: `usr-${role.toLowerCase()}-${Date.now()}`,
        email: email.toLowerCase().trim(),
        passwordHash: hashPassword(password),
        name: name.trim(),
        role,
        department: role === 'BOSS' ? 'Executive Leadership' : 'General',
        title: role === 'BOSS' ? 'Executive' : role === 'MANAGER' ? 'Manager' : 'Employee',
        managerId: null,
        isActive: true,
        avatarUrl: '',
        createdAt: now,
        updatedAt: now,
      };
      
      db.users.push(newUser);
      await saveDatabase(db);
      
      console.log('✅ User created successfully');
      console.log(`   ID: ${newUser.id}`);
    }
    
    console.log('\n🎉 User provisioning complete');
    console.log('   You can now log in with these credentials\n');
    
  } catch (error) {
    console.error('\n❌ Failed to provision user:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
