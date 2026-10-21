import { getDatabase } from '../lib/db/store.ts';
import { sanitizeUser } from '../lib/utils.ts';
import { calculateDashboardMetrics } from '../shared/permissions.ts';
import type { SafeUser, DashboardMetrics } from '../types/index.ts';

export async function getDashboardAnalytics(caller: SafeUser): Promise<DashboardMetrics> {
  const db = await getDatabase();
  const safeUsers = db.users.map((u) => sanitizeUser(u)!);

  let scopedTasks = db.tasks;
  let scopedUsers = safeUsers;

  if (caller.role === 'MANAGER') {
    scopedTasks = db.tasks.filter((t) => t.managerId === caller.id);
    scopedUsers = safeUsers.filter((u) => u.managerId === caller.id || u.id === caller.id);
  } else if (caller.role === 'EMPLOYEE') {
    scopedTasks = db.tasks.filter((t) => t.assigneeId === caller.id);
    scopedUsers = safeUsers.filter((u) => u.id === caller.id);
  }

  const metrics = calculateDashboardMetrics(scopedTasks, scopedUsers, new Date());

  // Attach recent relevant activities
  let relevantLogs = db.activityLogs;
  if (caller.role === 'MANAGER') {
    const reportIds = new Set(scopedUsers.map((u) => u.id));
    relevantLogs = db.activityLogs.filter(
      (log) => reportIds.has(log.actorId) || reportIds.has(log.targetId)
    );
  } else if (caller.role === 'EMPLOYEE') {
    relevantLogs = db.activityLogs.filter(
      (log) => log.actorId === caller.id || log.targetId === caller.id
    );
  }

  metrics.recentActivities = relevantLogs.slice(0, 8);

  const leads = db.leads || [];
  const estimates = db.estimates || [];
  const projects = db.projects || [];

  metrics.totalLeadsCount = leads.length;
  metrics.activeInquiriesCount = estimates.filter((e) => e.stage === 'NEW_INQUIRY').length;
  metrics.activeProjectsCount = projects.filter((p) => p.status === 'ACTIVE').length;
  metrics.totalPipelineValue =
    estimates.reduce((sum, e) => sum + e.total, 0) +
    projects.reduce((sum, p) => sum + p.contractValue, 0);

  return metrics;
}
