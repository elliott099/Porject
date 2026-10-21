import { z } from 'zod';

export const scopeItemSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1, 'Item title is required'),
  description: z.string().trim().default(''),
  quantity: z.number().min(0).default(1),
  unit: z.string().trim().default('Lump Sum'),
  unitPrice: z.number().min(0).default(0),
  total: z.number().min(0).default(0),
  isExclusion: z.boolean().optional().default(false),
});

export const scopeSectionSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, 'Section name is required'),
  items: z.array(scopeItemSchema),
  subtotal: z.number().min(0).default(0),
});

export const createEstimateSchema = z.object({
  leadId: z.string().nullable().optional(),
  clientName: z.string().trim().min(1),
  clientEmail: z.string().trim().email(),
  clientCompany: z.string().trim().min(1),
  clientPhone: z.string().trim().default(''),
  projectAddress: z.string().trim().min(1),
  projectName: z.string().trim().min(1),
  validDays: z.number().min(1).max(90).default(30),
});

export const updateEstimateSchema = z.object({
  projectName: z.string().trim().optional(),
  projectAddress: z.string().trim().optional(),
  sections: z.array(scopeSectionSchema).optional(),
  internalCosts: z
    .object({
      material: z.number().min(0),
      labour: z.number().min(0),
      licensingFee: z.number().min(0),
    })
    .optional(),
  contingencyPercent: z.number().min(0).max(100).optional(),
  marginPercent: z.number().min(0).max(100).optional(),
  pricingMode: z.enum(['LINE_ITEM', 'SECTION', 'TOTAL_ONLY', 'SCOPE_ONLY']).optional(),
  notes: z.string().optional(),
  stage: z
    .enum(['NEW_INQUIRY', 'DRAFTS', 'QUOTE_CREATION', 'SENT', 'WON', 'LOST', 'ARCHIVE'])
    .optional(),
  validUntil: z.string().optional(),
});

export const createScopeTemplateSchema = z.object({
  name: z.string().trim().min(2, 'Template name is required'),
  description: z.string().trim().default(''),
  sections: z.array(scopeSectionSchema),
});

export type CreateEstimateInput = z.infer<typeof createEstimateSchema>;
export type UpdateEstimateInput = z.infer<typeof updateEstimateSchema>;
export type CreateScopeTemplateInput = z.infer<typeof createScopeTemplateSchema>;
