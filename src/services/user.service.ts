import {
  getDatabase,
  saveDatabase,
  hashPassword,
  comparePassword,
} from '../lib/db/store.ts';
import { sanitizeUser } from '../lib/utils.ts';
import { logActivity } from './audit.service.ts';
import type {
  SafeUser,
  UserWithPassword,
} from '../types/index.ts';
import type { CreateUserInput, UpdateUserInput } from '../validations/user.schema.ts';

export async function getUserById(id: string): Promise<SafeUser | null> {
  const db = await getDatabase();
  const user = db.users.find((u) => u.id === id);
  return sanitizeUser(user);
}

export async function getUserByEmail(email: string): Promise<UserWithPassword | null> {
  const db = await getDatabase();
  const normalized = email.trim().toLowerCase();
  const user = db.users.find((u) => u.email.toLowerCase() === normalized);
  return user || null;
}

/**
 * Returns employees scoped strictly by role permissions:
 * - BOSS: All users
 * - MANAGER: Only direct reports where employee.managerId === caller.id
 * - EMPLOYEE: Only themselves
 */
export async function getUsers(caller: SafeUser): Promise<SafeUser[]> {
  const db = await getDatabase();

  if (caller.role === 'BOSS') {
    return db.users.map((u) => sanitizeUser(u)!);
  }

  if (caller.role === 'MANAGER') {
    // Only employees who report to this manager, plus self
    return db.users
      .filter((u) => u.managerId === caller.id || u.id === caller.id)
      .map((u) => sanitizeUser(u)!);
  }

  // EMPLOYEE only sees themselves
  return db.users
    .filter((u) => u.id === caller.id)
    .map((u) => sanitizeUser(u)!);
}

/**
 * Provision new account (BOSS only)
 */
export async function createUser(
  caller: SafeUser,
  input: CreateUserInput,
  ipAddress?: string
): Promise<SafeUser> {
  if (caller.role !== 'BOSS') {
    throw new Error('Forbidden: Only Boss/Admin can provision employee accounts.');
  }

  const db = await getDatabase();
  const existing = db.users.find(
    (u) => u.email.toLowerCase() === input.email.trim().toLowerCase()
  );

  if (existing) {
    throw new Error('An account with this email address already exists.');
  }

  const now = new Date().toISOString();
  const newUser: UserWithPassword = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    email: input.email.trim().toLowerCase(),
    passwordHash: hashPassword(input.password),
    name: input.name.trim(),
    role: input.role,
    department: input.department.trim(),
    title: input.title.trim(),
    managerId: input.managerId || null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  db.users.push(newUser);
  await saveDatabase(db);

  await logActivity({
    actorId: caller.id,
    actorName: caller.name,
    actorEmail: caller.email,
    actorRole: caller.role,
    action: 'USER_CREATE',
    targetType: 'USER',
    targetId: newUser.id,
    details: `Provisioned account for ${newUser.name} (${newUser.role}) in ${newUser.department}.`,
    ipAddress,
  });

  return sanitizeUser(newUser)!;
}

/**
 * Update user details
 */
export async function updateUser(
  caller: SafeUser,
  targetId: string,
  input: UpdateUserInput,
  ipAddress?: string
): Promise<SafeUser> {
  const db = await getDatabase();
  const userIndex = db.users.findIndex((u) => u.id === targetId);

  if (userIndex === -1) {
    throw new Error('User not found.');
  }

  const target = db.users[userIndex];

  // If caller is EMPLOYEE, can only update their own profile name
  if (caller.role === 'EMPLOYEE') {
    if (caller.id !== targetId) {
      throw new Error('Forbidden: Cannot modify another user profile.');
    }
    if (input.role || input.isActive !== undefined || input.managerId !== undefined) {
      throw new Error('Forbidden: Employees cannot alter role, status, or manager hierarchy.');
    }
  }

  // If caller is MANAGER, cannot change roles or toggle accounts
  if (caller.role === 'MANAGER') {
    if (caller.id !== targetId && target.managerId !== caller.id) {
      throw new Error('Forbidden: Manager cannot modify users outside supervisory tree.');
    }
    if (input.role || input.isActive !== undefined) {
      throw new Error('Forbidden: Only Boss can alter roles or deactivate accounts.');
    }
  }

  const now = new Date().toISOString();
  const updated: UserWithPassword = {
    ...target,
    name: input.name ?? target.name,
    department: input.department ?? target.department,
    title: input.title ?? target.title,
    managerId: input.managerId !== undefined ? input.managerId : target.managerId,
    role: caller.role === 'BOSS' && input.role ? input.role : target.role,
    isActive:
      caller.role === 'BOSS' && input.isActive !== undefined ? input.isActive : target.isActive,
    updatedAt: now,
  };

  db.users[userIndex] = updated;
  await saveDatabase(db);

  const action =
    input.isActive !== undefined && input.isActive !== target.isActive
      ? input.isActive
        ? 'USER_REACTIVATE'
        : 'USER_DEACTIVATE'
      : 'USER_UPDATE';

  await logActivity({
    actorId: caller.id,
    actorName: caller.name,
    actorEmail: caller.email,
    actorRole: caller.role,
    action,
    targetType: 'USER',
    targetId: updated.id,
    details: `Updated user profile for ${updated.name} (${updated.email}).`,
    ipAddress,
  });

  return sanitizeUser(updated)!;
}

/**
 * Change password
 */
export async function changeUserPassword(
  userId: string,
  currentPass: string,
  newPass: string,
  ipAddress?: string
): Promise<boolean> {
  const db = await getDatabase();
  const user = db.users.find((u) => u.id === userId);

  if (!user) {
    throw new Error('User not found.');
  }

  if (!comparePassword(currentPass, user.passwordHash)) {
    throw new Error('Current password does not match.');
  }

  user.passwordHash = hashPassword(newPass);
  user.updatedAt = new Date().toISOString();
  await saveDatabase(db);

  await logActivity({
    actorId: user.id,
    actorName: user.name,
    actorEmail: user.email,
    actorRole: user.role,
    action: 'PASSWORD_CHANGE',
    targetType: 'USER',
    targetId: user.id,
    details: `Password securely updated for account ${user.email}.`,
    ipAddress,
  });

  return true;
}
