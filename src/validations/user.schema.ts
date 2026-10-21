import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().email('Invalid email address format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: z.enum(['BOSS', 'MANAGER', 'EMPLOYEE']),
  department: z.string().trim().min(2, 'Department is required'),
  title: z.string().trim().min(2, 'Title is required'),
  managerId: z.string().nullable().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  department: z.string().trim().min(2).optional(),
  title: z.string().trim().min(2).optional(),
  managerId: z.string().nullable().optional(),
  role: z.enum(['BOSS', 'MANAGER', 'EMPLOYEE']).optional(),
  isActive: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
