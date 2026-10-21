import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().trim().min(2, 'Project name is required'),
  address: z.string().trim().min(3, 'Address is required'),
  clientName: z.string().trim().min(1),
  clientCompany: z.string().trim().min(1),
  clientEmail: z.string().trim().email(),
  clientPhone: z.string().trim().default(''),
  contractValue: z.number().min(0),
  estimateId: z.string().nullable().optional(),
  proposalNumber: z.string().nullable().optional(),
  assignedPmId: z.string().min(1),
  startDate: z.string(),
  targetCompletionDate: z.string(),
});

export const updateProjectPhaseSchema = z.object({
  phase: z.enum(['PRECONSTRUCTION', 'CONSTRUCTION', 'CLOSEOUT']),
  status: z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED']).optional(),
});

export const createInvoiceSchema = z.object({
  amount: z.number().positive('Invoice amount must be greater than zero'),
  issueDate: z.string(),
  dueDate: z.string(),
  notes: z.string().optional().default('Progress billing under contract scope'),
});

export const updateInvoiceStatusSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE']),
});

export const createTimesheetSchema = z.object({
  date: z.string(),
  hours: z.number().min(0.25).max(24),
  description: z.string().trim().min(3, 'Task description is required'),
});

export const updateTimesheetStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
});

export const createExpenseSchema = z.object({
  type: z.enum(['MATERIAL', 'REIMBURSEMENT']),
  vendorOrEmployee: z.string().trim().min(1, 'Vendor or employee name required'),
  category: z.string().trim().min(1, 'Expense category required'),
  amount: z.number().positive('Amount must be positive'),
  receiptNote: z.string().trim().min(1, 'Receipt note required'),
  date: z.string(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectPhaseInput = z.infer<typeof updateProjectPhaseSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceStatusInput = z.infer<typeof updateInvoiceStatusSchema>;
export type CreateTimesheetInput = z.infer<typeof createTimesheetSchema>;
export type UpdateTimesheetStatusInput = z.infer<typeof updateTimesheetStatusSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
