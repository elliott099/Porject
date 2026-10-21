import { getDatabase, saveDatabase } from '../lib/db/store.ts';
import { sanitizeText } from '../lib/utils.ts';
import { calculateEstimateFinancials } from '../shared/permissions.ts';
import { logActivity } from './audit.service.ts';
import type {
  SafeUser,
  Estimate,
  ScopeTemplate,
  Project,
} from '../types/index.ts';
import type {
  CreateEstimateInput,
  UpdateEstimateInput,
  CreateScopeTemplateInput,
} from '../validations/estimate.schema.ts';

export async function getScopeTemplates(): Promise<ScopeTemplate[]> {
  const db = await getDatabase();
  return db.scopeTemplates || [];
}

export async function createScopeTemplate(
  caller: SafeUser,
  input: CreateScopeTemplateInput
): Promise<ScopeTemplate> {
  const db = await getDatabase();
  const total = input.sections.reduce((sum, sec) => sum + sec.subtotal, 0);
  const now = new Date().toISOString();

  const newTemplate: ScopeTemplate = {
    id: `tpl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: sanitizeText(input.name),
    description: sanitizeText(input.description),
    sections: input.sections,
    total,
    createdAt: now,
  };

  db.scopeTemplates.push(newTemplate);
  await saveDatabase(db);

  await logActivity({
    actorId: caller.id,
    actorName: caller.name,
    actorEmail: caller.email,
    actorRole: caller.role,
    action: 'ESTIMATE_UPDATE',
    targetType: 'ESTIMATE',
    targetId: newTemplate.id,
    details: `Saved new reusable scope template "${newTemplate.name}" with total value of $${total.toLocaleString()}.`,
  });

  return newTemplate;
}

export async function getEstimates(): Promise<Estimate[]> {
  const db = await getDatabase();
  return db.estimates || [];
}

export async function getEstimateById(id: string): Promise<Estimate | null> {
  const db = await getDatabase();
  return db.estimates.find((e) => e.id === id) || null;
}

export async function createEstimate(
  caller: SafeUser,
  input: CreateEstimateInput,
  ipAddress?: string
): Promise<Estimate> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  // Generate proposal number
  const prefix = input.clientCompany.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'AZ';
  const randomNum = Math.floor(100 + Math.random() * 900);
  const proposalNumber = `${prefix}-2026-${randomNum}`;

  const defaultTemplate = db.scopeTemplates[0];
  const sections = defaultTemplate ? JSON.parse(JSON.stringify(defaultTemplate.sections)) : [];
  const baseCost = defaultTemplate ? defaultTemplate.total : 15000;

  const internalCosts = {
    material: Math.round(baseCost * 0.45),
    labour: Math.round(baseCost * 0.35),
    licensingFee: 500,
  };

  const financials = calculateEstimateFinancials(internalCosts, 10, 18);

  const proposalDate = now.split('T')[0];
  const validUntilDate = new Date();
  validUntilDate.setDate(validUntilDate.getDate() + (input.validDays || 30));

  const newEstimate: Estimate = {
    id: `est-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    proposalNumber,
    leadId: input.leadId || null,
    clientName: sanitizeText(input.clientName),
    clientEmail: input.clientEmail.trim().toLowerCase(),
    clientCompany: sanitizeText(input.clientCompany),
    clientPhone: sanitizeText(input.clientPhone || ''),
    projectAddress: sanitizeText(input.projectAddress),
    projectName: sanitizeText(input.projectName),
    stage: 'NEW_INQUIRY',
    proposalDate,
    validUntil: validUntilDate.toISOString().split('T')[0],
    sections,
    internalCosts,
    contingencyPercent: 10,
    marginPercent: 18,
    subtotal: financials.subtotal,
    contingencyAmount: financials.contingencyAmount,
    marginAmount: financials.marginAmount,
    total: baseCost,
    pricingMode: 'SECTION',
    notes: 'Standard 35% deposit required upon contract execution. Balance billed progress-milestone based. Excludes HST.',
    preparedBy: caller.name,
    preparedByTitle: caller.title,
    sentAt: null,
    wonAt: null,
    projectId: null,
    createdAt: now,
    updatedAt: now,
  };

  db.estimates.unshift(newEstimate);

  // If created from lead, link estimateId and transition lead stage
  if (input.leadId) {
    const lead = db.leads.find((l) => l.id === input.leadId);
    if (lead) {
      lead.estimateId = newEstimate.id;
      lead.stage = 'SENT_TO_ESTIMATING';
      lead.updatedAt = now;
    }
  }

  await saveDatabase(db);

  await logActivity({
    actorId: caller.id,
    actorName: caller.name,
    actorEmail: caller.email,
    actorRole: caller.role,
    action: 'ESTIMATE_CREATE',
    targetType: 'ESTIMATE',
    targetId: newEstimate.id,
    details: `Created proposal ${newEstimate.proposalNumber} for ${newEstimate.clientCompany} ($${newEstimate.total.toLocaleString()}).`,
    ipAddress,
  });

  return newEstimate;
}

export async function sendLeadToEstimating(
  caller: SafeUser,
  leadId: string,
  ipAddress?: string
): Promise<{ lead: any; estimate: Estimate }> {
  const db = await getDatabase();
  const lead = db.leads.find((l) => l.id === leadId);
  if (!lead) {
    throw new Error('Lead not found.');
  }

  const estimate = await createEstimate(
    caller,
    {
      leadId: lead.id,
      clientName: lead.clientName,
      clientEmail: lead.clientEmail,
      clientCompany: lead.clientCompany,
      clientPhone: lead.clientPhone,
      projectAddress: lead.projectAddress,
      projectName: `${lead.clientCompany} Project Fit-Out`,
      validDays: 30,
    },
    ipAddress
  );

  return { lead, estimate };
}

export async function updateEstimate(
  caller: SafeUser,
  id: string,
  input: UpdateEstimateInput,
  ipAddress?: string
): Promise<Estimate> {
  const db = await getDatabase();
  const estimate = db.estimates.find((e) => e.id === id);
  if (!estimate) {
    throw new Error('Estimate not found.');
  }

  const now = new Date().toISOString();

  if (input.projectName) estimate.projectName = sanitizeText(input.projectName);
  if (input.projectAddress) estimate.projectAddress = sanitizeText(input.projectAddress);
  if (input.sections) estimate.sections = input.sections;
  if (input.pricingMode) estimate.pricingMode = input.pricingMode;
  if (input.notes !== undefined) estimate.notes = input.notes;
  if (input.stage) estimate.stage = input.stage;
  if (input.validUntil) estimate.validUntil = input.validUntil;

  if (input.internalCosts) estimate.internalCosts = input.internalCosts;
  if (input.contingencyPercent !== undefined) estimate.contingencyPercent = input.contingencyPercent;
  if (input.marginPercent !== undefined) estimate.marginPercent = input.marginPercent;

  // Recalculate financial breakdown
  const financials = calculateEstimateFinancials(
    estimate.internalCosts,
    estimate.contingencyPercent,
    estimate.marginPercent
  );

  estimate.subtotal = financials.subtotal;
  estimate.contingencyAmount = financials.contingencyAmount;
  estimate.marginAmount = financials.marginAmount;

  // If sections exist, total can also track section total or margin total
  const sectionsTotal = estimate.sections.reduce((sum, s) => sum + (s.subtotal || 0), 0);
  estimate.total = sectionsTotal > 0 ? sectionsTotal : financials.total;
  estimate.updatedAt = now;

  await saveDatabase(db);

  await logActivity({
    actorId: caller.id,
    actorName: caller.name,
    actorEmail: caller.email,
    actorRole: caller.role,
    action: 'ESTIMATE_UPDATE',
    targetType: 'ESTIMATE',
    targetId: estimate.id,
    details: `Updated proposal ${estimate.proposalNumber} specifications [Total: $${estimate.total.toLocaleString()}].`,
    ipAddress,
  });

  return estimate;
}

export async function sendEstimateToClient(
  caller: SafeUser,
  id: string,
  emailData: { to: string; subject: string; body: string },
  ipAddress?: string
): Promise<Estimate> {
  const db = await getDatabase();
  const estimate = db.estimates.find((e) => e.id === id);
  if (!estimate) {
    throw new Error('Estimate not found.');
  }

  const now = new Date().toISOString();
  estimate.stage = 'SENT';
  estimate.sentAt = now;
  estimate.updatedAt = now;

  await saveDatabase(db);

  await logActivity({
    actorId: caller.id,
    actorName: caller.name,
    actorEmail: caller.email,
    actorRole: caller.role,
    action: 'ESTIMATE_SENT',
    targetType: 'ESTIMATE',
    targetId: estimate.id,
    details: `Transmitted proposal ${estimate.proposalNumber} to ${emailData.to} ("${emailData.subject}").`,
    ipAddress,
  });

  return estimate;
}

export async function acceptEstimateAndPromoteToProject(
  caller: SafeUser,
  estimateId: string,
  ipAddress?: string
): Promise<{ estimate: Estimate; project: Project }> {
  const db = await getDatabase();
  const estimate = db.estimates.find((e) => e.id === estimateId);
  if (!estimate) {
    throw new Error('Estimate not found.');
  }

  const now = new Date().toISOString();
  estimate.stage = 'WON';
  estimate.wonAt = now;

  // Target completion: 60 days
  const startDate = now.split('T')[0];
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 60);

  const initialDepositAmount = Math.round(estimate.total * 0.35);
  const hst = Math.round(initialDepositAmount * 0.13 * 100) / 100;

  const newProject: Project = {
    id: `prj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: estimate.projectName,
    address: estimate.projectAddress,
    clientName: estimate.clientName,
    clientCompany: estimate.clientCompany,
    clientEmail: estimate.clientEmail,
    clientPhone: estimate.clientPhone,
    estimateId: estimate.id,
    proposalNumber: estimate.proposalNumber,
    contractValue: estimate.total,
    phase: 'PRECONSTRUCTION',
    status: 'ACTIVE',
    assignedPmId: caller.id,
    assignedPmName: caller.name,
    startDate,
    targetCompletionDate: targetDate.toISOString().split('T')[0],
    milestones: [
      {
        id: `ms-${Date.now()}-1`,
        title: 'Contract Signing & Mobilization Deposit',
        targetDate: startDate,
        completed: true,
      },
      {
        id: `ms-${Date.now()}-2`,
        title: 'Drawings Review & ESA Permit Application',
        targetDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
        completed: false,
      },
      {
        id: `ms-${Date.now()}-3`,
        title: 'Rough-In Piping & Feeder Installation',
        targetDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        completed: false,
      },
      {
        id: `ms-${Date.now()}-4`,
        title: 'Final Trim-Out & ESA Safety Certificate',
        targetDate: targetDate.toISOString().split('T')[0],
        completed: false,
      },
    ],
    invoices: [
      {
        id: `inv-${Date.now()}-1`,
        projectId: '', // will be set below
        invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(10 + Math.random() * 90)}`,
        issueDate: startDate,
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        amount: initialDepositAmount,
        hst,
        totalWithHst: initialDepositAmount + hst,
        status: 'SENT',
        notes: `35% Mobilization Deposit per accepted Proposal #${estimate.proposalNumber}`,
        createdAt: now,
      },
    ],
    timesheets: [],
    expenses: [],
    createdAt: now,
    updatedAt: now,
  };

  newProject.invoices[0].projectId = newProject.id;
  estimate.projectId = newProject.id;

  db.projects.unshift(newProject);
  await saveDatabase(db);

  await logActivity({
    actorId: caller.id,
    actorName: caller.name,
    actorEmail: caller.email,
    actorRole: caller.role,
    action: 'ESTIMATE_WON',
    targetType: 'ESTIMATE',
    targetId: estimate.id,
    details: `Accepted proposal ${estimate.proposalNumber}. Promoted directly to active project "${newProject.name}" ($${estimate.total.toLocaleString()} contract value).`,
    ipAddress,
  });

  return { estimate, project: newProject };
}
