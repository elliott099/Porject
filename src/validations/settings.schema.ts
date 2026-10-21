import { z } from 'zod';

export const updateSettingsSchema = z.object({
  companyName: z.string().trim().min(2).max(100).optional(),
  defaultTaskDeadlineDays: z.number().int().min(1).max(90).optional(),
  enforceManagerReview: z.boolean().optional(),
  allowEmployeeSelfAssignment: z.boolean().optional(),
  maintenanceMode: z.boolean().optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
