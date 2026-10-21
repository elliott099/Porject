/**
 * MongoDB Cloud Storage - Exclusive Data Store
 * 
 * This module provides MongoDB Atlas as the sole data storage backend.
 * All data is stored in the cloud with no local file fallback.
 */

import type { DatabaseSchema } from './json-store.ts';
import {
  hashPassword,
  comparePassword,
  generateInitialSeed,
} from './json-store.ts';
import {
  loadDatabaseFromMongo,
  saveDatabaseToMongo,
  isMongoDBConfigured,
  connectToMongoDB,
  closeMongoDB,
} from './mongo-store.ts';

let storageInitialized = false;
let inMemoryCache: DatabaseSchema | null = null;

/**
 * Initialize MongoDB storage
 */
async function initializeStorage(): Promise<void> {
  if (storageInitialized) {
    return;
  }

  if (!isMongoDBConfigured()) {
    throw new Error(
      '❌ MONGODB_URI is not configured!\n' +
      '   This application requires MongoDB Atlas for data storage.\n' +
      '   Please set MONGODB_URI in your .env file.\n' +
      '   See MONGODB_SETUP.md for setup instructions.'
    );
  }

  console.log('📦 Using MongoDB Cloud storage');
  
  try {
    // Connect to MongoDB
    await connectToMongoDB();
    
    // Check if database is empty and initialize if needed
    const data = await loadDatabaseFromMongo();
    if (data.users.length === 0) {
      console.log('📝 Initializing empty production database...');
      console.log('   Use `npm run create-user` to add users');
      const seedData = generateInitialSeed();
      await saveDatabaseToMongo(seedData);
      inMemoryCache = seedData;
    } else {
      inMemoryCache = data;
    }
  } catch (error) {
    console.error('❌ Failed to initialize MongoDB:', error);
    throw new Error(
      'Failed to connect to MongoDB Atlas.\n' +
      'Please check your MONGODB_URI configuration and network connection.\n' +
      'See MONGODB_SETUP.md for troubleshooting.'
    );
  }

  storageInitialized = true;
}

/**
 * Get the current database from MongoDB
 */
export async function getDatabase(): Promise<DatabaseSchema> {
  await initializeStorage();

  try {
    // Always reload from MongoDB to get latest data
    inMemoryCache = await loadDatabaseFromMongo();
    return inMemoryCache;
  } catch (error) {
    console.error('Error loading from MongoDB:', error);
    // Return cached data if available
    if (inMemoryCache) {
      console.warn('⚠️  Using cached data due to MongoDB connection issue');
      return inMemoryCache;
    }
    throw error;
  }
}

/**
 * Save the database to MongoDB
 */
export async function saveDatabase(data: DatabaseSchema): Promise<void> {
  await initializeStorage();

  inMemoryCache = data;

  try {
    await saveDatabaseToMongo(data);
  } catch (error) {
    console.error('Error saving to MongoDB:', error);
    throw error;
  }
}

/**
 * Get information about the MongoDB connection
 */
export function getStorageInfo(): {
  type: 'mongodb';
  configured: boolean;
  connected: boolean;
} {
  return {
    type: 'mongodb',
    configured: isMongoDBConfigured(),
    connected: storageInitialized,
  };
}

/**
 * Close MongoDB connection (useful for graceful shutdown)
 */
export async function closeDatabase(): Promise<void> {
  await closeMongoDB();
  storageInitialized = false;
  inMemoryCache = null;
}

// Re-export utility functions
export { hashPassword, comparePassword, generateInitialSeed };
