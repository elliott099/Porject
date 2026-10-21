import { getDatabase, saveDatabase } from '../lib/db/store.ts';
import type { ActivityLog } from '../types/index.ts';

export async function logActivity(
  entry: Omit<ActivityLog, 'id' | 'timestamp'>
): Promise<ActivityLog> {
  const db = await getDatabase();
  const newLog: ActivityLog = {
    ...entry,
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  db.activityLogs.unshift(newLog);
  // Keep up to 500 immutable logs
  if (db.activityLogs.length > 500) {
    db.activityLogs = db.activityLogs.slice(0, 500);
  }

  await saveDatabase(db);
  return newLog;
}

export async function getActivityLogs(limit = 100): Promise<ActivityLog[]> {
  const db = await getDatabase();
  return db.activityLogs.slice(0, limit);
}
