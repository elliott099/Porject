import { z } from 'zod';

export const createLeadSchema = z.object({
  clientName: z.string().trim().min(2, 'Client name is required'),
  clientPhone: z.string().trim().min(5, 'Phone number is required'),
  clientEmail: z.string().trim().email('Valid email is required'),
  clientCompany: z.string().trim().min(1, 'Company name is required'),
  projectAddress: z.string().trim().min(3, 'Project address is required'),
  referralSource: z.string().trim().default('Website Inbound'),
  firstNote: z.string().trim().optional().default(''),
});

export const updateLeadStageSchema = z.object({
  stage: z.enum(['NEW_LEADS', 'QUALIFIED', 'DRAFT', 'SENT_TO_ESTIMATING']),
});

export const addContactLogSchema = z.object({
  type: z.enum(['EMAIL', 'CALL', 'TEXT', 'MEETING']),
  note: z.string().trim().min(1, 'Log note is required'),
});

export const addLeadAttachmentSchema = z.object({
  name: z.string().trim().min(1),
  size: z.string().trim().default('1.2 MB'),
  type: z.string().trim().default('application/pdf'),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadStageInput = z.infer<typeof updateLeadStageSchema>;
export type AddContactLogInput = z.infer<typeof addContactLogSchema>;
export type AddLeadAttachmentInput = z.infer<typeof addLeadAttachmentSchema>;
