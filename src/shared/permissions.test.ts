import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessRoute,
  canManageUser,
  isEmployeeInManagerTeam,
  canViewTask,
  canMutateTask,
  validateEmployeeTaskUpdate,
  isTaskOverdue,
  calculateDashboardMetrics,
  canApproveTimesheets,
  canViewProjectFinancials,
  calculateEstimateFinancials,
} from './permissions.ts';
import type { Task, SafeUser } from '../types/index.ts';

test('1. RBAC Matrix: Route access rules by role', () => {
  // BOSS has global access
  assert.equal(canAccessRoute('BOSS', '/dashboard'), true);
  assert.equal(canAccessRoute('BOSS', '/tasks'), true);
  assert.equal(canAccessRoute('BOSS', '/employees'), true);
  assert.equal(canAccessRoute('BOSS', '/audit-logs'), true);
  assert.equal(canAccessRoute('BOSS', '/settings'), true);

  // MANAGER cannot access audit logs
  assert.equal(canAccessRoute('MANAGER', '/dashboard'), true);
  assert.equal(canAccessRoute('MANAGER', '/tasks'), true);
  assert.equal(canAccessRoute('MANAGER', '/employees'), true);
  assert.equal(canAccessRoute('MANAGER', '/audit-logs'), false);
  assert.equal(canAccessRoute('MANAGER', '/settings'), true);

  // EMPLOYEE cannot access employees directory or audit logs
  assert.equal(canAccessRoute('EMPLOYEE', '/dashboard'), true);
  assert.equal(canAccessRoute('EMPLOYEE', '/tasks'), true);
  assert.equal(canAccessRoute('EMPLOYEE', '/employees'), false);
  assert.equal(canAccessRoute('EMPLOYEE', '/audit-logs'), false);
  assert.equal(canAccessRoute('EMPLOYEE', '/settings'), true);
});

test('2. RBAC Matrix: User management privilege', () => {
  assert.equal(canManageUser('BOSS', 'EMPLOYEE'), true);
  assert.equal(canManageUser('BOSS', 'MANAGER'), true);
  assert.equal(canManageUser('MANAGER', 'EMPLOYEE'), false);
  assert.equal(canManageUser('EMPLOYEE', 'EMPLOYEE'), false);
});

test('3. Manager Team Boundary: Direct report association', () => {
  const managerId = 'mgr-marcus';
  const directReportManagerId = 'mgr-marcus';
  const outsideReportManagerId = 'mgr-elena';

  assert.equal(isEmployeeInManagerTeam(directReportManagerId, managerId), true);
  assert.equal(isEmployeeInManagerTeam(outsideReportManagerId, managerId), false);
  assert.equal(isEmployeeInManagerTeam(null, managerId), false);
  assert.equal(isEmployeeInManagerTeam(undefined, managerId), false);
});

test('4. Zero-Trust Task Visibility: Strict manager and employee isolation', () => {
  const boss = { id: 'boss-1', role: 'BOSS' as const };
  const managerMarcus = { id: 'mgr-marcus', role: 'MANAGER' as const };
  const managerElena = { id: 'mgr-elena', role: 'MANAGER' as const };
  const employeeAlex = { id: 'emp-alex', role: 'EMPLOYEE' as const };
  const employeeDavid = { id: 'emp-david', role: 'EMPLOYEE' as const };

  const taskAlex = { assigneeId: 'emp-alex', managerId: 'mgr-marcus' };
  const taskDavid = { assigneeId: 'emp-david', managerId: 'mgr-elena' };

  // Boss sees all
  assert.equal(canViewTask(boss, taskAlex), true);
  assert.equal(canViewTask(boss, taskDavid), true);

  // Marcus can view Alex's task, but CANNOT view David's task
  assert.equal(canViewTask(managerMarcus, taskAlex), true);
  assert.equal(canViewTask(managerMarcus, taskDavid), false);

  // Elena can view David's task, but CANNOT view Alex's task
  assert.equal(canViewTask(managerElena, taskDavid), true);
  assert.equal(canViewTask(managerElena, taskAlex), false);

  // Alex can view only his own task
  assert.equal(canViewTask(employeeAlex, taskAlex), true);
  assert.equal(canViewTask(employeeAlex, taskDavid), false);

  // David can view only his own task
  assert.equal(canViewTask(employeeDavid, taskDavid), true);
  assert.equal(canViewTask(employeeDavid, taskAlex), false);
});

test('5. Zero-Trust Task Mutation: Strict manager and employee mutation boundary', () => {
  const managerMarcus = { id: 'mgr-marcus', role: 'MANAGER' as const };
  const managerElena = { id: 'mgr-elena', role: 'MANAGER' as const };
  const taskAlex = { assigneeId: 'emp-alex', managerId: 'mgr-marcus' };

  // Marcus can mutate Alex's task because he is the managing supervisor
  assert.equal(canMutateTask(managerMarcus, taskAlex), true);
  // Elena cannot mutate Alex's task
  assert.equal(canMutateTask(managerElena, taskAlex), false);
});

test('6. Employee Field Locking: Whitelist validation rejects unauthorized field alterations', () => {
  // Valid employee status update with progress notes
  const validUpdate = {
    status: 'IN_PROGRESS',
    progressNote: 'Started implementing the OAuth token exchange handler.',
  };
  const validCheck = validateEmployeeTaskUpdate(validUpdate);
  assert.equal(validCheck.isValid, true);
  assert.deepEqual(validCheck.forbiddenFields, []);

  // Invalid attempts to modify priority, title, assigneeId or deadline
  const maliciousUpdate = {
    status: 'COMPLETED',
    priority: 'LOW',
    deadline: '2027-01-01',
    assigneeId: 'someone-else',
    title: 'Tampered Title',
  };
  const invalidCheck = validateEmployeeTaskUpdate(maliciousUpdate);
  assert.equal(invalidCheck.isValid, false);
  assert.equal(invalidCheck.forbiddenFields.includes('priority'), true);
  assert.equal(invalidCheck.forbiddenFields.includes('deadline'), true);
  assert.equal(invalidCheck.forbiddenFields.includes('assigneeId'), true);
  assert.equal(invalidCheck.forbiddenFields.includes('title'), true);
});

test('7. Overdue Math: Flags past-due tasks only when incomplete', () => {
  const referenceDate = new Date('2026-10-21T12:00:00Z');

  // Past deadline and pending -> overdue
  const overduePending = {
    status: 'PENDING' as const,
    deadline: '2026-10-20T12:00:00Z',
  };
  assert.equal(isTaskOverdue(overduePending, referenceDate), true);

  // Past deadline and in progress -> overdue
  const overdueInProgress = {
    status: 'IN_PROGRESS' as const,
    deadline: '2026-10-20T12:00:00Z',
  };
  assert.equal(isTaskOverdue(overdueInProgress, referenceDate), true);

  // Past deadline but COMPLETED -> NOT overdue
  const completedPastDeadline = {
    status: 'COMPLETED' as const,
    deadline: '2026-10-20T12:00:00Z',
  };
  assert.equal(isTaskOverdue(completedPastDeadline, referenceDate), false);

  // Future deadline and pending -> NOT overdue
  const futurePending = {
    status: 'PENDING' as const,
    deadline: '2026-10-25T12:00:00Z',
  };
  assert.equal(isTaskOverdue(futurePending, referenceDate), false);
});

test('8. Dashboard KPI Aggregation: Accurately computes totals, completion rate and distribution', () => {
  const referenceDate = new Date('2026-10-21T12:00:00Z');

  const mockUsers: SafeUser[] = [
    {
      id: 'u1',
      email: 'boss@wp.io',
      name: 'Boss',
      role: 'BOSS',
      department: 'Executive',
      title: 'CEO',
      managerId: null,
      isActive: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'u2',
      email: 'mgr@wp.io',
      name: 'Manager',
      role: 'MANAGER',
      department: 'Engineering',
      title: 'Lead',
      managerId: 'u1',
      isActive: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'u3',
      email: 'emp1@wp.io',
      name: 'Emp1',
      role: 'EMPLOYEE',
      department: 'Engineering',
      title: 'Dev',
      managerId: 'u2',
      isActive: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'u4',
      email: 'emp2@wp.io',
      name: 'Emp2',
      role: 'EMPLOYEE',
      department: 'Engineering',
      title: 'Dev',
      managerId: 'u2',
      isActive: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  const mockTasks: Task[] = [
    {
      id: 't1',
      title: 'Task 1',
      description: 'Desc',
      status: 'PENDING',
      priority: 'HIGH',
      deadline: '2026-10-20T00:00:00Z', // Overdue
      assigneeId: 'u3',
      creatorId: 'u2',
      managerId: 'u2',
      progressNotes: [],
      createdAt: '2026-10-10',
      updatedAt: '2026-10-10',
    },
    {
      id: 't2',
      title: 'Task 2',
      description: 'Desc',
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      deadline: '2026-10-25T00:00:00Z',
      assigneeId: 'u3',
      creatorId: 'u2',
      managerId: 'u2',
      progressNotes: [],
      createdAt: '2026-10-10',
      updatedAt: '2026-10-10',
    },
    {
      id: 't3',
      title: 'Task 3',
      description: 'Desc',
      status: 'COMPLETED',
      priority: 'MEDIUM',
      deadline: '2026-10-15T00:00:00Z',
      assigneeId: 'u4',
      creatorId: 'u2',
      managerId: 'u2',
      progressNotes: [],
      completedAt: '2026-10-14T00:00:00Z',
      createdAt: '2026-10-10',
      updatedAt: '2026-10-14',
    },
    {
      id: 't4',
      title: 'Task 4',
      description: 'Desc',
      status: 'COMPLETED',
      priority: 'LOW',
      deadline: '2026-10-28T00:00:00Z',
      assigneeId: 'u4',
      creatorId: 'u2',
      managerId: 'u2',
      progressNotes: [],
      completedAt: '2026-10-18T00:00:00Z',
      createdAt: '2026-10-10',
      updatedAt: '2026-10-18',
    },
  ];

  const metrics = calculateDashboardMetrics(mockTasks, mockUsers, referenceDate);

  assert.equal(metrics.totalStaff, 4);
  assert.equal(metrics.activeManagers, 1);
  assert.equal(metrics.activeEmployees, 2);
  assert.equal(metrics.tasksTotal, 4);
  assert.equal(metrics.tasksPending, 1);
  assert.equal(metrics.tasksInProgress, 1);
  assert.equal(metrics.tasksCompleted, 2);
  assert.equal(metrics.tasksOverdue, 1);
  assert.equal(metrics.completionRate, 50); // 2 out of 4 = 50%
});

test('9. CRM & Estimates RBAC Route Restrictions', () => {
  // Boss & Manager have full access to Leads and Estimates
  assert.equal(canAccessRoute('BOSS', '/leads'), true);
  assert.equal(canAccessRoute('MANAGER', '/leads'), true);
  assert.equal(canAccessRoute('BOSS', '/estimates'), true);
  assert.equal(canAccessRoute('MANAGER', '/estimates'), true);

  // Employee is strictly forbidden from Leads and Estimates
  assert.equal(canAccessRoute('EMPLOYEE', '/leads'), false);
  assert.equal(canAccessRoute('EMPLOYEE', '/estimates'), false);
  assert.equal(canAccessRoute('EMPLOYEE', '/api/leads'), false);
  assert.equal(canAccessRoute('EMPLOYEE', '/api/estimates'), false);
});

test('10. Project Workspace Access & Timesheet RBAC Boundaries', () => {
  // All roles can access Projects workspace
  assert.equal(canAccessRoute('BOSS', '/projects'), true);
  assert.equal(canAccessRoute('MANAGER', '/projects'), true);
  assert.equal(canAccessRoute('EMPLOYEE', '/projects'), true);

  // Only Boss & Manager can approve timesheets
  assert.equal(canApproveTimesheets('BOSS'), true);
  assert.equal(canApproveTimesheets('MANAGER'), true);
  assert.equal(canApproveTimesheets('EMPLOYEE'), false);

  // Only Boss & Manager can view project financials (invoices & margins)
  assert.equal(canViewProjectFinancials('BOSS'), true);
  assert.equal(canViewProjectFinancials('MANAGER'), true);
  assert.equal(canViewProjectFinancials('EMPLOYEE'), false);
});

test('11. Estimate Contingency & Margin Calculator Math', () => {
  const costs = {
    material: 6000,
    labour: 4000,
    licensingFee: 500,
  };
  const contingencyPercent = 10;
  const marginPercent = 20;

  const result = calculateEstimateFinancials(costs, contingencyPercent, marginPercent);

  // Subtotal = 6000 + 4000 + 500 = 10500
  assert.equal(result.subtotal, 10500);

  // Contingency = 10500 * 0.10 = 1050
  assert.equal(result.contingencyAmount, 1050);

  // Cost with contingency = 11550
  // Margin = 11550 * 0.20 = 2310
  assert.equal(result.marginAmount, 2310);

  // Total = 11550 + 2310 = 13860
  assert.equal(result.total, 13860);
});

test('12. Zero-cost and boundary contingency calculation', () => {
  const zeroCosts = { material: 0, labour: 0, licensingFee: 0 };
  const zeroResult = calculateEstimateFinancials(zeroCosts, 10, 20);
  assert.equal(zeroResult.subtotal, 0);
  assert.equal(zeroResult.contingencyAmount, 0);
  assert.equal(zeroResult.marginAmount, 0);
  assert.equal(zeroResult.total, 0);
});
