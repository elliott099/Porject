import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
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

export interface DatabaseSchema {
  users: UserWithPassword[];
  tasks: Task[];
  activityLogs: ActivityLog[];
  settings: CompanySettings;
  clients: Client[];
  leads: Lead[];
  scopeTemplates: ScopeTemplate[];
  estimates: Estimate[];
  projects: Project[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

let inMemoryDb: DatabaseSchema | null = null;
let writeQueue = Promise.resolve();

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function hashPassword(plain: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(plain, salt);
}

export function comparePassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

/**
 * Generate empty production-ready database schema
 * No demo data - use `npm run create-user` to add users
 */
export function generateInitialSeed(): DatabaseSchema {
  const now = new Date().toISOString();

  const settings: CompanySettings = {
    companyName: 'WorkPulse',
    defaultTaskDeadlineDays: 7,
    enforceManagerReview: true,
    allowEmployeeSelfAssignment: false,
    maintenanceMode: false,
    updatedAt: now,
    updatedBy: 'system',
  };

  return {
    users: [],
    tasks: [],
    activityLogs: [],
    settings,
    clients: [],
    leads: [],
    scopeTemplates: [],
    estimates: [],
    projects: [],
  };
}

export function getDatabase(): DatabaseSchema {
  if (inMemoryDb) {
    return inMemoryDb;
  }

  ensureDataDir();

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as DatabaseSchema;
      
      // Auto-migrate schema if new tables are missing
      const freshSeed = generateInitialSeed();
      if (!parsed.clients) parsed.clients = freshSeed.clients;
      if (!parsed.leads) parsed.leads = freshSeed.leads;
      if (!parsed.scopeTemplates) parsed.scopeTemplates = freshSeed.scopeTemplates;
      if (!parsed.estimates) parsed.estimates = freshSeed.estimates;
      if (!parsed.projects) parsed.projects = freshSeed.projects;
      if (!parsed.settings) parsed.settings = freshSeed.settings;
      
      inMemoryDb = parsed;
      return inMemoryDb;
    } catch (err) {
      console.warn('Failed reading existing database.json, initializing empty:', err);
    }
  }

  // Initialize with empty production database
  const seeded = generateInitialSeed();
  inMemoryDb = seeded;
  
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(seeded, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed writing initial database.json:', err);
  }

  return inMemoryDb;
}

export async function saveDatabase(data: DatabaseSchema): Promise<void> {
  inMemoryDb = data;
  ensureDataDir();

  writeQueue = writeQueue.then(async () => {
    try {
      const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Error saving database to disk:', err);
    }
  });

  await writeQueue;
}
