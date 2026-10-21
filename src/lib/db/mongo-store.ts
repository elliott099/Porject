import { MongoClient, Db, Collection } from 'mongodb';
import type { DatabaseSchema } from './json-store.ts';
import type {
  UserWithPassword,
  Task,
  ActivityLog,
  CompanySettings,
  Client,
  Lead,
  ScopeTemplate,
  Estimate,
  Project,
} from '../../types/index.ts';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGODB_DB_NAME || 'workpulse';

interface MongoCollections {
  users: Collection<UserWithPassword>;
  tasks: Collection<Task>;
  activityLogs: Collection<ActivityLog>;
  settings: Collection<CompanySettings>;
  clients: Collection<Client>;
  leads: Collection<Lead>;
  scopeTemplates: Collection<ScopeTemplate>;
  estimates: Collection<Estimate>;
  projects: Collection<Project>;
}

/**
 * Connect to MongoDB and return the database instance
 */
export async function connectToMongoDB(): Promise<Db> {
  if (cachedDb && cachedClient) {
    return cachedDb;
  }

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    cachedClient = client;
    cachedDb = client.db(DB_NAME);
    
    console.log(`✓ Connected to MongoDB: ${DB_NAME}`);
    
    // Create indexes for better performance
    await createIndexes(cachedDb);
    
    return cachedDb;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

/**
 * Create indexes on collections for performance optimization
 */
async function createIndexes(db: Db): Promise<void> {
  try {
    // Users indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1 });
    
    // Tasks indexes
    await db.collection('tasks').createIndex({ assigneeId: 1 });
    await db.collection('tasks').createIndex({ status: 1 });
    await db.collection('tasks').createIndex({ deadline: 1 });
    
    // Activity logs indexes
    await db.collection('activityLogs').createIndex({ timestamp: -1 });
    await db.collection('activityLogs').createIndex({ actorId: 1 });
    
    // Clients indexes
    await db.collection('clients').createIndex({ email: 1 });
    
    // Leads indexes
    await db.collection('leads').createIndex({ stage: 1 });
    await db.collection('leads').createIndex({ clientEmail: 1 });
    
    // Estimates indexes
    await db.collection('estimates').createIndex({ proposalNumber: 1 }, { unique: true });
    await db.collection('estimates').createIndex({ stage: 1 });
    await db.collection('estimates').createIndex({ leadId: 1 });
    
    // Projects indexes
    await db.collection('projects').createIndex({ status: 1 });
    await db.collection('projects').createIndex({ assignedPmId: 1 });
    
    console.log('✓ MongoDB indexes created');
  } catch (error) {
    console.warn('Warning: Some indexes may already exist:', error);
  }
}

/**
 * Get all collections as typed objects
 */
function getCollections(db: Db): MongoCollections {
  return {
    users: db.collection<UserWithPassword>('users'),
    tasks: db.collection<Task>('tasks'),
    activityLogs: db.collection<ActivityLog>('activityLogs'),
    settings: db.collection<CompanySettings>('settings'),
    clients: db.collection<Client>('clients'),
    leads: db.collection<Lead>('leads'),
    scopeTemplates: db.collection<ScopeTemplate>('scopeTemplates'),
    estimates: db.collection<Estimate>('estimates'),
    projects: db.collection<Project>('projects'),
  };
}

/**
 * Load the entire database from MongoDB into memory format
 */
export async function loadDatabaseFromMongo(): Promise<DatabaseSchema> {
  const db = await connectToMongoDB();
  const collections = getCollections(db);

  // Fetch all data in parallel
  const [
    users,
    tasks,
    activityLogs,
    settingsArray,
    clients,
    leads,
    scopeTemplates,
    estimates,
    projects,
  ] = await Promise.all([
    collections.users.find({}).toArray(),
    collections.tasks.find({}).toArray(),
    collections.activityLogs.find({}).sort({ timestamp: -1 }).toArray(),
    collections.settings.find({}).toArray(),
    collections.clients.find({}).toArray(),
    collections.leads.find({}).toArray(),
    collections.scopeTemplates.find({}).toArray(),
    collections.estimates.find({}).toArray(),
    collections.projects.find({}).toArray(),
  ]);

  // MongoDB adds _id field, remove it to match schema
  const cleanUsers = users.map(({ _id, ...rest }: any) => rest) as UserWithPassword[];
  const cleanTasks = tasks.map(({ _id, ...rest }: any) => rest) as Task[];
  const cleanActivityLogs = activityLogs.map(({ _id, ...rest }: any) => rest) as ActivityLog[];
  const cleanClients = clients.map(({ _id, ...rest }: any) => rest) as Client[];
  const cleanLeads = leads.map(({ _id, ...rest }: any) => rest) as Lead[];
  const cleanScopeTemplates = scopeTemplates.map(({ _id, ...rest }: any) => rest) as ScopeTemplate[];
  const cleanEstimates = estimates.map(({ _id, ...rest }: any) => rest) as Estimate[];
  const cleanProjects = projects.map(({ _id, ...rest }: any) => rest) as Project[];

  // Settings is a single document, not an array
  let settings: CompanySettings;
  if (settingsArray.length > 0) {
    const { _id, ...rest } = settingsArray[0] as any;
    settings = rest as CompanySettings;
  } else {
    // Default settings if none exist
    settings = {
      companyName: 'WorkPulse Technologies Inc.',
      defaultTaskDeadlineDays: 7,
      enforceManagerReview: true,
      allowEmployeeSelfAssignment: false,
      maintenanceMode: false,
      updatedAt: new Date().toISOString(),
      updatedBy: 'system',
    };
  }

  return {
    users: cleanUsers,
    tasks: cleanTasks,
    activityLogs: cleanActivityLogs,
    settings,
    clients: cleanClients,
    leads: cleanLeads,
    scopeTemplates: cleanScopeTemplates,
    estimates: cleanEstimates,
    projects: cleanProjects,
  };
}

/**
 * Save the entire database to MongoDB
 */
export async function saveDatabaseToMongo(data: DatabaseSchema): Promise<void> {
  const db = await connectToMongoDB();
  const collections = getCollections(db);

  try {
    // Clear and insert users
    await collections.users.deleteMany({});
    if (data.users.length > 0) {
      await collections.users.insertMany(data.users as any[]);
    }

    // Clear and insert tasks
    await collections.tasks.deleteMany({});
    if (data.tasks.length > 0) {
      await collections.tasks.insertMany(data.tasks as any[]);
    }

    // Clear and insert activity logs
    await collections.activityLogs.deleteMany({});
    if (data.activityLogs.length > 0) {
      await collections.activityLogs.insertMany(data.activityLogs as any[]);
    }

    // Update or insert settings
    await collections.settings.deleteMany({});
    await collections.settings.insertOne(data.settings as any);

    // Clear and insert clients
    await collections.clients.deleteMany({});
    if (data.clients.length > 0) {
      await collections.clients.insertMany(data.clients as any[]);
    }

    // Clear and insert leads
    await collections.leads.deleteMany({});
    if (data.leads.length > 0) {
      await collections.leads.insertMany(data.leads as any[]);
    }

    // Clear and insert scope templates
    await collections.scopeTemplates.deleteMany({});
    if (data.scopeTemplates.length > 0) {
      await collections.scopeTemplates.insertMany(data.scopeTemplates as any[]);
    }

    // Clear and insert estimates
    await collections.estimates.deleteMany({});
    if (data.estimates.length > 0) {
      await collections.estimates.insertMany(data.estimates as any[]);
    }

    // Clear and insert projects
    await collections.projects.deleteMany({});
    if (data.projects.length > 0) {
      await collections.projects.insertMany(data.projects as any[]);
    }

    console.log('✓ Database saved to MongoDB successfully');
  } catch (error) {
    console.error('Error saving database to MongoDB:', error);
    throw error;
  }
}

/**
 * Close MongoDB connection
 */
export async function closeMongoDB(): Promise<void> {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
    console.log('✓ MongoDB connection closed');
  }
}

/**
 * Check if MongoDB is configured and available
 */
export function isMongoDBConfigured(): boolean {
  return !!MONGODB_URI && MONGODB_URI.trim().length > 0;
}
