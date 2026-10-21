/**
 * Test MongoDB Connection
 * 
 * This script tests the MongoDB connection and verifies the setup
 */

import 'dotenv/config';
import { connectToMongoDB, closeMongoDB, isMongoDBConfigured } from '../src/lib/db/mongo-store.ts';

async function testConnection() {
  console.log('🔍 Testing MongoDB Connection...\n');

  // Check if MongoDB is configured
  const configured = isMongoDBConfigured();
  console.log(`📋 MongoDB Configured: ${configured ? '✅ Yes' : '❌ No'}`);

  if (!configured) {
    console.log('\n⚠️  MongoDB URI is not set in .env file');
    console.log('   The application will use local JSON storage instead.\n');
    console.log('   To use MongoDB, set MONGODB_URI in your .env file.');
    console.log('   See MONGODB_SETUP.md for detailed instructions.\n');
    process.exit(0);
  }

  console.log('');

  try {
    // Test connection
    console.log('🔌 Connecting to MongoDB...');
    const db = await connectToMongoDB();
    console.log('✅ Successfully connected to MongoDB!');
    console.log(`   Database: ${db.databaseName}\n`);

    // List collections
    console.log('📚 Available collections:');
    const collections = await db.listCollections().toArray();
    if (collections.length === 0) {
      console.log('   (No collections yet - will be created on first data save)\n');
    } else {
      collections.forEach((coll) => {
        console.log(`   - ${coll.name}`);
      });
      console.log('');
    }

    // Get database stats
    const stats = await db.stats();
    console.log('📊 Database Statistics:');
    console.log(`   Collections: ${stats.collections}`);
    console.log(`   Data Size: ${(stats.dataSize / 1024).toFixed(2)} KB`);
    console.log(`   Storage Size: ${(stats.storageSize / 1024).toFixed(2)} KB`);
    console.log(`   Indexes: ${stats.indexes}`);
    console.log('');

    // Close connection
    await closeMongoDB();
    console.log('✅ Test completed successfully!\n');
    console.log('🎉 Your MongoDB setup is working correctly.');
    console.log('   You can now run your application with: npm run dev\n');

  } catch (error: any) {
    console.error('\n❌ Connection failed:', error.message);
    console.log('\n🔧 Troubleshooting steps:');
    console.log('   1. Verify your MONGODB_URI in .env is correct');
    console.log('   2. Check that your IP is whitelisted in MongoDB Atlas');
    console.log('   3. Ensure your database user credentials are correct');
    console.log('   4. Verify network connectivity\n');
    console.log('   See MONGODB_SETUP.md for detailed setup instructions.\n');
    process.exit(1);
  }
}

testConnection();
