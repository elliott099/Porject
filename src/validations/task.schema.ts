import { z } from 'zod';

export const taskStatusEnum = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']);
export const taskPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const createTaskSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(150),
  description: z.string().trim().min(5, 'Description must be at least 5 characters').max(2000),
  priority: taskPriorityEnum,
  deadline: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid deadline date format',
  }),
  assigneeId: z.string().min(1, 'Assignee is required'),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(3).max(150).optional(),
  description: z.string().trim().min(5).max(2000).optional(),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  deadline: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid deadline' })
    .optional(),
  assigneeId: z.string().optional(),
});

// Strictly whitelisted for EMPLOYEE updates
export const employeeUpdateTaskSchema = z.object({
  status: taskStatusEnum,
  progressNote: z.string().trim().max(1000).optional(),
});

export const addProgressNoteSchema = z.object({
  content: z.string().trim().min(2, 'Note must not be empty').max(1000),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type EmployeeUpdateTaskInput = z.infer<typeof employeeUpdateTaskSchema>;
export type AddProgressNoteInput = z.infer<typeof addProgressNoteSchema>;
