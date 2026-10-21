import { getDatabase, saveDatabase } from '../lib/db/store.ts';
import { sanitizeText } from '../lib/utils.ts';
import { canApproveTimesheets, canViewProjectFinancials } from '../shared/permissions.ts';
import { logActivity } from './audit.service.ts';
import type {
  SafeUser,
  Project,
  Invoice,
  Timesheet,
  Expense,
} from '../types/index.ts';
import type {
  CreateProjectInput,
  UpdateProjectPhaseInput,
  CreateInvoiceInput,
  UpdateInvoiceStatusInput,
  CreateTimesheetInput,
  UpdateTimesheetStatusInput,
  CreateExpenseInput,
} from '../validations/project.schema.ts';

export async function getProjects(caller: SafeUser): Promise<Project[]> {
  const db = await getDatabase();
  const projects = db.projects || [];

  if (canViewProjectFinancials(caller.role)) {
    return projects;
  }

  // For Employee: strip sensitive invoice financial data from list
  return projects.map((p) => ({
    ...p,
    invoices: [], // Hidden from employees
  }));
}

export async function getProjectById(
  caller: SafeUser,
  id: string
): Promise<Project | null> {
  const db = await getDatabase();
  const project = db.projects.find((p) => p.id === id);
  if (!project) return null;

  if (canViewProjectFinancials(caller.role)) {
    return project;
  }

  // Employee view: strip invoices
  return {
    ...project,
    invoices: [],
  };
}

export async function createProject(
  caller: SafeUser,
  input: CreateProjectInput,
  ipAddress?: string
): Promise<Project> {
  if (caller.role === 'EMPLOYEE') {
    throw new Error('Forbidden: Employees cannot create projects.');
  }

  const db = await getDatabase();
  const now = new Date().toISOString();

  const newProject: Project = {
    id: `prj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: sanitizeText(input.name),
    address: sanitizeText(input.address),
    clientName: sanitizeText(input.clientName),
    clientCompany: sanitizeText(input.clientCompany),
    clientEmail: input.clientEmail.trim().toLowerCase(),
    clientPhone: sanitizeText(input.clientPhone || ''),
    contractValue: input.contractValue,
    estimateId: input.estimateId || null,
    proposalNumber: input.proposalNumber || null,
    phase: 'PRECONSTRUCTION',
    status: 'ACTIVE',
    assignedPmId: input.assignedPmId,
    assignedPmName: caller.name,
    startDate: input.startDate,
    targetCompletionDate: input.targetCompletionDate,
    milestones: [
      {
        id: `ms-${Date.now()}-1`,
        title: 'Project Kickoff & Permit Acquisition',
        targetDate: input.startDate,
        completed: true,
      },
      {
        id: `ms-${Date.now()}-2`,
        title: 'Rough-In Electrical Piping',
        targetDate: input.targetCompletionDate,
        completed: false,
      },
    ],
    invoices: [],
    timesheets: [],
    expenses: [],
    createdAt: now,
    updatedAt: now,
  };

  db.projects.unshift(newProject);
  await saveDatabase(db);

  await logActivity({
    actorId: caller.id,
    actorName: caller.name,
    actorEmail: caller.email,
    actorRole: caller.role,
    action: 'PROJECT_CREATE',
    targetType: 'PROJECT',
    targetId: newProject.id,
    details: `Created new project "${newProject.name}" ($${newProject.contractValue.toLocaleString()}).`,
    ipAddress,
  });

  return newProject;
}

export async function updateProjectPhase(
  caller: SafeUser,
  id: string,
  input: UpdateProjectPhaseInput,
  ipAddress?: string
): Promise<Project> {
  if (caller.role === 'EMPLOYEE') {
    throw new Error('Forbidden: Employees cannot change project phases.');
  }

  const db = await getDatabase();
  const project = db.projects.find((p) => p.id === id);
  if (!project) {
    throw new Error('Project not found.');
  }

  const oldPhase = project.phase;
  project.phase = input.phase;
  if (input.status) project.status = input.status;
  project.updatedAt = new Date().toISOString();

  await saveDatabase(db);

  await logActivity({
    actorId: caller.id,
    actorName: caller.name,
    actorEmail: caller.email,
    actorRole: caller.role,
    action: 'PROJECT_UPDATE',
    targetType: 'PROJECT',
    targetId: project.id,
    details: `Transitioned project "${project.name}" phase from ${oldPhase} to ${project.phase}.`,
    ipAddress,
  });

  return project;
}

// -------------------------------------------------------------
// Invoices
// -------------------------------------------------------------
export async function createInvoice(
  caller: SafeUser,
  projectId: string,
  input: CreateInvoiceInput,
  ipAddress?: string
): Promise<Invoice> {
  if (!canViewProjectFinancials(caller.role)) {
    throw new Error('Forbidden: Only Boss & Managers can issue project billing invoices.');
  }

  const db = await getDatabase();
  const project = db.projects.find((p) => p.id === projectId);
  if (!project) {
    throw new Error('Project not found.');
  }

  const now = new Date().toISOString();
  const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
  const hst = Math.round(input.amount * 0.13 * 100) / 100;

  const newInvoice: Invoice = {
    id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    projectId,
    invoiceNumber,
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    amount: input.amount,
    hst,
    totalWithHst: input.amount + hst,
    status: 'SENT',
    notes: sanitizeText(input.notes || ''),
    createdAt: now,
  };

  project.invoices.unshift(newInvoice);
  project.updatedAt = now;
  await saveDatabase(db);

  await logActivity({
    actorId: caller.id,
    actorName: caller.name,
    actorEmail: caller.email,
    actorRole: caller.role,
    action: 'INVOICE_CREATE',
    targetType: 'INVOICE',
    targetId: newInvoice.id,
    details: `Issued client invoice ${newInvoice.invoiceNumber} ($${newInvoice.totalWithHst.toLocaleString()} incl HST) for project "${project.name}".`,
    ipAddress,
  });

  return newInvoice;
}

export async function updateInvoiceStatus(
  caller: SafeUser,
  projectId: string,
  invoiceId: string,
  input: UpdateInvoiceStatusInput,
  ipAddress?: string
): Promise<Invoice> {
  if (!canViewProjectFinancials(caller.role)) {
    throw new Error('Forbidden: Only Boss & Managers can update invoice status.');
  }

  const db = await getDatabase();
  const project = db.projects.find((p) => p.id === projectId);
  if (!project) throw new Error('Project not found.');

  const invoice = project.invoices.find((inv) => inv.id === invoiceId);
  if (!invoice) throw new Error('Invoice not found.');

  const oldStatus = invoice.status;
  invoice.status = input.status;
  project.updatedAt = new Date().toISOString();
  await saveDatabase(db);

  await logActivity({
    actorId: caller.id,
    actorName: caller.name,
    actorEmail: caller.email,
    actorRole: caller.role,
    action: 'INVOICE_UPDATE',
    targetType: 'INVOICE',
    targetId: invoice.id,
    details: `Updated invoice ${invoice.invoiceNumber} status from ${oldStatus} to ${invoice.status}.`,
    ipAddress,
  });

  return invoice;
}

// -------------------------------------------------------------
// Timesheets
// -------------------------------------------------------------
export async function createTimesheet(
  caller: SafeUser,
  projectId: string,
  input: CreateTimesheetInput,
  ipAddress?: string
): Promise<Timesheet> {
  const db = await getDatabase();
  const project = db.projects.find((p) => p.id === projectId);
  if (!project) throw new Error('Project not found.');

  const now = new Date().toISOString();
  const newTimesheet: Timesheet = {
    id: `ts-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    projectId,
    projectName: project.name,
    employeeId: caller.id,
    employeeName: caller.name,
    date: input.date,
    hours: input.hours,
    description: sanitizeText(input.description),
    status: 'PENDING',
    approvedBy: null,
    approvedAt: null,
    createdAt: now,
  };

  project.timesheets.unshift(newTimesheet);
  project.updatedAt = now;
  await saveDatabase(db);

  await logActivity({
    actorId: caller.id,
    actorName: caller.name,
    actorEmail: caller.email,
    actorRole: caller.role,
    action: 'TIMESHEET_CREATE',
    targetType: 'TIMESHEET',
    targetId: newTimesheet.id,
    details: `${caller.name} logged ${input.hours} hrs for "${project.name}": ${input.description}.`,
    ipAddress,
  });

  return newTimesheet;
}

export async function updateTimesheetStatus(
  caller: SafeUser,
  projectId: string,
  timesheetId: string,
  input: UpdateTimesheetStatusInput,
  ipAddress?: string
): Promise<Timesheet> {
  if (!canApproveTimesheets(caller.role)) {
    throw new Error('Forbidden: Only Boss and Managers can approve timesheets.');
  }

  const db = await getDatabase();
  const project = db.projects.find((p) => p.id === projectId);
  if (!project) throw new Error('Project not found.');

  const timesheet = project.timesheets.find((ts) => ts.id === timesheetId);
  if (!timesheet) throw new Error('Timesheet entry not found.');

  const now = new Date().toISOString();
  timesheet.status = input.status;
  if (input.status === 'APPROVED') {
    timesheet.approvedBy = caller.name;
    timesheet.approvedAt = now;
  } else {
    timesheet.approvedBy = null;
    timesheet.approvedAt = null;
  }

  project.updatedAt = now;
  await saveDatabase(db);

  await logActivity({
    actorId: caller.id,
    actorName: caller.name,
    actorEmail: caller.email,
    actorRole: caller.role,
    action: 'TIMESHEET_APPROVE',
    targetType: 'TIMESHEET',
    targetId: timesheet.id,
    details: `${caller.name} ${input.status.toLowerCase()} timesheet entry (${timesheet.hours} hrs by ${timesheet.employeeName}).`,
    ipAddress,
  });

  return timesheet;
}

// -------------------------------------------------------------
// Material Expenses & Reimbursements
// -------------------------------------------------------------
export async function createExpense(
  caller: SafeUser,
  projectId: string,
  input: CreateExpenseInput,
  ipAddress?: string
): Promise<Expense> {
  const db = await getDatabase();
  const project = db.projects.find((p) => p.id === projectId);
  if (!project) throw new Error('Project not found.');

  const now = new Date().toISOString();
  const newExpense: Expense = {
    id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    projectId,
    type: input.type,
    vendorOrEmployee: sanitizeText(input.vendorOrEmployee),
    category: sanitizeText(input.category),
    amount: input.amount,
    receiptNote: sanitizeText(input.receiptNote),
    date: input.date,
    submittedBy: caller.name,
    createdAt: now,
  };

  project.expenses.unshift(newExpense);
  project.updatedAt = now;
  await saveDatabase(db);

  await logActivity({
    actorId: caller.id,
    actorName: caller.name,
    actorEmail: caller.email,
    actorRole: caller.role,
    action: 'EXPENSE_CREATE',
    targetType: 'PROJECT',
    targetId: newExpense.id,
    details: `${caller.name} logged ${input.type.toLowerCase()} expense of $${input.amount.toFixed(2)} (${input.vendorOrEmployee} - ${input.category}) for "${project.name}".`,
    ipAddress,
  });

  return newExpense;
}
