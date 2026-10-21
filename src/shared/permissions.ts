import type {
  UserRole,
  Task,
  SafeUser,
  DashboardMetrics,
  TaskStatus,
  TaskPriority,
} from '../types/index.ts';

/**
 * RBAC Route Access Matrix
 */
export function canAccessRoute(role: UserRole, route: string): boolean {
  const normalized = route.toLowerCase();

  // Root or dashboard is accessible to all authenticated users
  if (normalized === '/' || normalized === '/dashboard' || normalized.startsWith('/dashboard')) {
    return true;
  }

  // Tasks is accessible to all
  if (normalized.startsWith('/tasks')) {
    return true;
  }

  // Settings is accessible to all (profile & password for everyone; company settings for BOSS only)
  if (normalized.startsWith('/settings')) {
    return true;
  }

  // Leads & Estimates: BOSS and MANAGER only
  if (normalized.startsWith('/leads') || normalized.startsWith('/api/leads') ||
      normalized.startsWith('/estimates') || normalized.startsWith('/api/estimates')) {
    return role === 'BOSS' || role === 'MANAGER';
  }

  // Projects: Accessible to all roles (Employee restricted to assigned projects/timesheet logging)
  if (normalized.startsWith('/projects') || normalized.startsWith('/api/projects')) {
    return true;
  }

  // Employees directory and hierarchy: BOSS and MANAGER only
  if (normalized.startsWith('/employees') || normalized.startsWith('/api/users')) {
    return role === 'BOSS' || role === 'MANAGER';
  }

  // Audit Logs: BOSS only
  if (normalized.startsWith('/audit-logs') || normalized.startsWith('/api/audit-logs')) {
    return role === 'BOSS';
  }

  return false;
}

/**
 * Lead, Estimate & Project Financial Permissions
 */
export function canManageSales(role: UserRole): boolean {
  return role === 'BOSS' || role === 'MANAGER';
}

export function canApproveTimesheets(role: UserRole): boolean {
  return role === 'BOSS' || role === 'MANAGER';
}

export function canViewProjectFinancials(role: UserRole): boolean {
  return role === 'BOSS' || role === 'MANAGER';
}

/**
 * Pure calculation for Estimate/Proposal internal costs, contingency, and margin
 */
export function calculateEstimateFinancials(
  internalCosts: { material: number; labour: number; licensingFee: number },
  contingencyPercent: number,
  marginPercent: number
): {
  subtotal: number;
  contingencyAmount: number;
  marginAmount: number;
  total: number;
} {
  const subtotal = Math.round(((internalCosts.material || 0) + (internalCosts.labour || 0) + (internalCosts.licensingFee || 0)) * 100) / 100;
  const contingencyAmount = Math.round(subtotal * (contingencyPercent / 100) * 100) / 100;
  const costWithContingency = subtotal + contingencyAmount;
  const marginAmount = Math.round(costWithContingency * (marginPercent / 100) * 100) / 100;
  const total = Math.round((costWithContingency + marginAmount) * 100) / 100;

  return {
    subtotal,
    contingencyAmount,
    marginAmount,
    total,
  };
}

/**
 * Checks whether an actor can manage (create, edit role, deactivate) a user
 */
export function canManageUser(actorRole: UserRole, _targetRole?: UserRole): boolean {
  return actorRole === 'BOSS';
}

/**
 * Checks whether an employee belongs to a manager's supervisory tree
 */
export function isEmployeeInManagerTeam(
  employeeManagerId: string | null | undefined,
  managerId: string
): boolean {
  if (!employeeManagerId || !managerId) return false;
  return employeeManagerId === managerId;
}

/**
 * Zero-Trust Task Visibility Check
 */
export function canViewTask(
  user: { id: string; role: UserRole },
  task: { assigneeId: string; managerId: string }
): boolean {
  if (user.role === 'BOSS') {
    return true;
  }
  if (user.role === 'MANAGER') {
    return task.managerId === user.id;
  }
  if (user.role === 'EMPLOYEE') {
    return task.assigneeId === user.id;
  }
  return false;
}

/**
 * Zero-Trust Task Mutation Check
 */
export function canMutateTask(
  user: { id: string; role: UserRole },
  task: { assigneeId: string; managerId: string }
): boolean {
  if (user.role === 'BOSS') {
    return true;
  }
  if (user.role === 'MANAGER') {
    return task.managerId === user.id;
  }
  if (user.role === 'EMPLOYEE') {
    return task.assigneeId === user.id;
  }
  return false;
}

/**
 * Employee Field Locking Verification
 * Employees are strictly whitelisted to modify `status` and `progressNote` (or `progressNotes`).
 * Any mutation targeting `title`, `description`, `priority`, `deadline`, or `assigneeId` is rejected.
 */
export const FORBIDDEN_EMPLOYEE_FIELDS = [
  'title',
  'description',
  'priority',
  'deadline',
  'assigneeId',
  'creatorId',
  'managerId',
  'id',
  'createdAt',
];

export function validateEmployeeTaskUpdate(
  payload: Record<string, unknown>
): { isValid: boolean; forbiddenFields: string[] } {
  const keys = Object.keys(payload);
  const foundForbidden = keys.filter((key) => FORBIDDEN_EMPLOYEE_FIELDS.includes(key));

  return {
    isValid: foundForbidden.length === 0,
    forbiddenFields: foundForbidden,
  };
}

/**
 * Overdue Date Calculation
 * Tasks that are COMPLETED are never overdue.
 * Non-completed tasks with deadline < reference date are overdue.
 */
export function isTaskOverdue(
  task: { status: TaskStatus; deadline: string },
  referenceDate: Date = new Date()
): boolean {
  if (task.status === 'COMPLETED') {
    return false;
  }
  const deadlineTime = new Date(task.deadline).getTime();
  const refTime = referenceDate.getTime();
  return deadlineTime < refTime;
}

/**
 * Dashboard KPI & Distribution Aggregation
 */
export function calculateDashboardMetrics(
  tasks: Task[],
  users: SafeUser[],
  referenceDate: Date = new Date()
): DashboardMetrics {
  const totalStaff = users.length;
  const activeManagers = users.filter((u) => u.role === 'MANAGER' && u.isActive).length;
  const activeEmployees = users.filter((u) => u.role === 'EMPLOYEE' && u.isActive).length;

  const tasksTotal = tasks.length;
  let tasksInProgress = 0;
  let tasksPending = 0;
  let tasksCompleted = 0;
  let tasksOverdue = 0;

  const priorityCounts: Record<TaskPriority, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  };

  const statusCounts: Record<TaskStatus, number> = {
    PENDING: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0,
  };

  for (const task of tasks) {
    if (task.status === 'IN_PROGRESS') tasksInProgress++;
    else if (task.status === 'PENDING') tasksPending++;
    else if (task.status === 'COMPLETED') tasksCompleted++;

    if (task.status in statusCounts) {
      statusCounts[task.status]++;
    }

    if (task.priority in priorityCounts) {
      priorityCounts[task.priority]++;
    }

    if (isTaskOverdue(task, referenceDate)) {
      tasksOverdue++;
    }
  }

  const completionRate = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;

  return {
    totalStaff,
    activeManagers,
    activeEmployees,
    tasksTotal,
    tasksInProgress,
    tasksPending,
    tasksCompleted,
    tasksOverdue,
    completionRate,
    statusDistribution: [
      { status: 'PENDING', label: 'Pending', count: statusCounts.PENDING },
      { status: 'IN_PROGRESS', label: 'In Progress', count: statusCounts.IN_PROGRESS },
      { status: 'COMPLETED', label: 'Completed', count: statusCounts.COMPLETED },
    ],
    priorityDistribution: [
      { priority: 'LOW', label: 'Low', count: priorityCounts.LOW },
      { priority: 'MEDIUM', label: 'Medium', count: priorityCounts.MEDIUM },
      { priority: 'HIGH', label: 'High', count: priorityCounts.HIGH },
      { priority: 'CRITICAL', label: 'Critical', count: priorityCounts.CRITICAL },
    ],
    recentActivities: [],
  };
}
