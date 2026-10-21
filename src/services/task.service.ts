import { getDatabase, saveDatabase } from '../lib/db/store.ts';
import { sanitizeUser, sanitizeText } from '../lib/utils.ts';
import {
  canViewTask,
  canMutateTask,
  validateEmployeeTaskUpdate,
  isEmployeeInManagerTeam,
} from '../shared/permissions.ts';
import { logActivity } from './audit.service.ts';
import type {
  SafeUser,
  Task,
  TaskWithDetails,
  TaskProgressNote,
} from '../types/index.ts';
import type {
  CreateTaskInput,
  UpdateTaskInput,
  EmployeeUpdateTaskInput,
} from '../validations/task.schema.ts';

function enrichTask(task: Task, users: SafeUser[]): TaskWithDetails {
  const assignee = users.find((u) => u.id === task.assigneeId);
  const creator = users.find((u) => u.id === task.creatorId);
  return {
    ...task,
    assignee,
    creator,
  };
}

export async function getTasks(caller: SafeUser): Promise<TaskWithDetails[]> {
  const db = await getDatabase();
  const safeUsers = db.users.map((u) => sanitizeUser(u)!);

  let filtered: Task[] = [];
  if (caller.role === 'BOSS') {
    filtered = db.tasks;
  } else if (caller.role === 'MANAGER') {
    // Scoped exclusively to tasks belonging to caller's team
    filtered = db.tasks.filter((t) => t.managerId === caller.id);
  } else {
    // Scoped to employee's own assigned tasks
    filtered = db.tasks.filter((t) => t.assigneeId === caller.id);
  }

  return filtered.map((t) => enrichTask(t, safeUsers));
}

export async function getTaskById(
  caller: SafeUser,
  taskId: string
): Promise<TaskWithDetails | null> {
  const db = await getDatabase();
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) return null;

  if (!canViewTask(caller, task)) {
    throw new Error('Forbidden: You do not have permission to access this task.');
  }

  const safeUsers = db.users.map((u) => sanitizeUser(u)!);
  return enrichTask(task, safeUsers);
}

export async function createTask(
  caller: SafeUser,
  input: CreateTaskInput,
  ipAddress?: string
): Promise<TaskWithDetails> {
  if (caller.role === 'EMPLOYEE') {
    throw new Error('Forbidden: Employees cannot create or assign tasks.');
  }

  const db = await getDatabase();
  const assignee = db.users.find((u) => u.id === input.assigneeId);
  if (!assignee) {
    throw new Error('Assignee user does not exist.');
  }

  // Manager isolation: Manager can ONLY assign to employees in their supervisory tree
  if (caller.role === 'MANAGER') {
    if (!isEmployeeInManagerTeam(assignee.managerId, caller.id) && assignee.id !== caller.id) {
      throw new Error(
        'Forbidden: Managers can only assign tasks to employees in their direct supervisory team.'
      );
    }
  }

  // Determine supervisory manager for this task
  const taskManagerId =
    caller.role === 'MANAGER'
      ? caller.id
      : assignee.managerId || caller.id;

  const now = new Date().toISOString();
  const newTask: Task = {
    id: `tsk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: sanitizeText(input.title),
    description: sanitizeText(input.description),
    status: 'PENDING',
    priority: input.priority,
    deadline: input.deadline,
    assigneeId: assignee.id,
    creatorId: caller.id,
    managerId: taskManagerId,
    progressNotes: [],
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  db.tasks.unshift(newTask);
  await saveDatabase(db);

  await logActivity({
    actorId: caller.id,
    actorName: caller.name,
    actorEmail: caller.email,
    actorRole: caller.role,
    action: 'TASK_CREATE',
    targetType: 'TASK',
    targetId: newTask.id,
    details: `Created task "${newTask.title}" assigned to ${assignee.name} (${newTask.priority} priority).`,
    ipAddress,
  });

  const safeUsers = db.users.map((u) => sanitizeUser(u)!);
  return enrichTask(newTask, safeUsers);
}

export async function updateTask(
  caller: SafeUser,
  taskId: string,
  input: UpdateTaskInput,
  ipAddress?: string
): Promise<TaskWithDetails> {
  const db = await getDatabase();
  const taskIndex = db.tasks.findIndex((t) => t.id === taskId);
  if (taskIndex === -1) {
    throw new Error('Task not found.');
  }

  const task = db.tasks[taskIndex];

  if (!canMutateTask(caller, task)) {
    throw new Error('Forbidden: You are not authorized to modify this task.');
  }

  if (caller.role === 'EMPLOYEE') {
    throw new Error(
      'Forbidden: Employees must use the dedicated task progress execution endpoint.'
    );
  }

  // Manager reassignment verification
  if (caller.role === 'MANAGER' && input.assigneeId && input.assigneeId !== task.assigneeId) {
    const newAssignee = db.users.find((u) => u.id === input.assigneeId);
    if (!newAssignee || !isEmployeeInManagerTeam(newAssignee.managerId, caller.id)) {
      throw new Error(
        'Forbidden: Managers cannot reassign tasks outside their supervisory team.'
      );
    }
  }

  const now = new Date().toISOString();
  const updatedStatus = input.status ?? task.status;
  const isNowCompleted = updatedStatus === 'COMPLETED';

  const updated: Task = {
    ...task,
    title: input.title ? sanitizeText(input.title) : task.title,
    description: input.description ? sanitizeText(input.description) : task.description,
    status: updatedStatus,
    priority: input.priority ?? task.priority,
    deadline: input.deadline ?? task.deadline,
    assigneeId: input.assigneeId ?? task.assigneeId,
    completedAt: isNowCompleted ? task.completedAt || now : null,
    updatedAt: now,
  };

  db.tasks[taskIndex] = updated;
  await saveDatabase(db);

  await logActivity({
    actorId: caller.id,
    actorName: caller.name,
    actorEmail: caller.email,
    actorRole: caller.role,
    action: input.status && input.status !== task.status ? 'TASK_STATUS_CHANGE' : 'TASK_UPDATE',
    targetType: 'TASK',
    targetId: updated.id,
    details: `Updated task "${updated.title}" [Status: ${updated.status}, Priority: ${updated.priority}].`,
    ipAddress,
  });

  const safeUsers = db.users.map((u) => sanitizeUser(u)!);
  return enrichTask(updated, safeUsers);
}

/**
 * Employee Task Execution & Progress Handler
 * Strict Field Whitelisting: ONLY status and progressNote are accepted.
 */
export async function employeeUpdateTask(
  caller: SafeUser,
  taskId: string,
  rawPayload: Record<string, unknown>,
  input: EmployeeUpdateTaskInput,
  ipAddress?: string
): Promise<TaskWithDetails> {
  const check = validateEmployeeTaskUpdate(rawPayload);
  if (!check.isValid) {
    throw new Error(
      `Forbidden: Employee field locked. Cannot mutate restricted fields: ${check.forbiddenFields.join(', ')}`
    );
  }

  const db = await getDatabase();
  const taskIndex = db.tasks.findIndex((t) => t.id === taskId);
  if (taskIndex === -1) {
    throw new Error('Task not found.');
  }

  const task = db.tasks[taskIndex];

  // Zero-trust check: must be assigned to caller
  if (task.assigneeId !== caller.id) {
    throw new Error('Forbidden: You can only update tasks assigned to your account.');
  }

  const now = new Date().toISOString();
  const isNowCompleted = input.status === 'COMPLETED';

  const notes = [...task.progressNotes];
  if (input.progressNote && input.progressNote.trim()) {
    const newNote: TaskProgressNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      authorId: caller.id,
      authorName: caller.name,
      authorRole: caller.role,
      content: sanitizeText(input.progressNote.trim()),
      createdAt: now,
    };
    notes.push(newNote);
  }

  const updated: Task = {
    ...task,
    status: input.status,
    progressNotes: notes,
    completedAt: isNowCompleted ? task.completedAt || now : null,
    updatedAt: now,
  };

  db.tasks[taskIndex] = updated;
  await saveDatabase(db);

  await logActivity({
    actorId: caller.id,
    actorName: caller.name,
    actorEmail: caller.email,
    actorRole: caller.role,
    action: 'TASK_STATUS_CHANGE',
    targetType: 'TASK',
    targetId: updated.id,
    details: `Employee ${caller.name} transitioned task status to ${updated.status}${
      input.progressNote ? ' with progress notes.' : '.'
    }`,
    ipAddress,
  });

  const safeUsers = db.users.map((u) => sanitizeUser(u)!);
  return enrichTask(updated, safeUsers);
}

export async function deleteTask(
  caller: SafeUser,
  taskId: string,
  ipAddress?: string
): Promise<boolean> {
  if (caller.role === 'EMPLOYEE') {
    throw new Error('Forbidden: Employees cannot delete tasks.');
  }

  const db = await getDatabase();
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) {
    throw new Error('Task not found.');
  }

  if (caller.role === 'MANAGER' && task.managerId !== caller.id) {
    throw new Error('Forbidden: Managers can only delete tasks within their supervisory team.');
  }

  db.tasks = db.tasks.filter((t) => t.id !== taskId);
  await saveDatabase(db);

  await logActivity({
    actorId: caller.id,
    actorName: caller.name,
    actorEmail: caller.email,
    actorRole: caller.role,
    action: 'TASK_DELETE',
    targetType: 'TASK',
    targetId: task.id,
    details: `Deleted task "${task.title}".`,
    ipAddress,
  });

  return true;
}
