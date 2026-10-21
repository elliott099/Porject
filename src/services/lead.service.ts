import { getDatabase, saveDatabase } from '../lib/db/store.ts';
import { sanitizeText } from '../lib/utils.ts';
import { logActivity } from './audit.service.ts';
import type { SafeUser, Lead, Client, LeadStage } from '../types/index.ts';
import type {
  CreateLeadInput,
  AddContactLogInput,
  AddLeadAttachmentInput,
} from '../validations/lead.schema.ts';

export async function getClients(): Promise<Client[]> {
  const db = await getDatabase();
  return db.clients || [];
}

export async function createClient(
  clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Client> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const newClient: Client = {
    ...clientData,
    id: `cli-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    createdAt: now,
    updatedAt: now,
  };
  db.clients.push(newClient);
  await saveDatabase(db);
  return newClient;
}

export async function getLeads(): Promise<Lead[]> {
  const db = await getDatabase();
  return db.leads || [];
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const db = await getDatabase();
  return db.leads.find((l) => l.id === id) || null;
}

export async function createLead(
  caller: SafeUser,
  input: CreateLeadInput,
  ipAddress?: string
): Promise<Lead> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  // If client doesn't exist, auto-create client in directory
  const existingClient = db.clients.find(
    (c) => c.email.toLowerCase() === input.clientEmail.trim().toLowerCase()
  );
  if (!existingClient) {
    db.clients.push({
      id: `cli-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: input.clientName.trim(),
      phone: input.clientPhone.trim(),
      email: input.clientEmail.trim().toLowerCase(),
      company: input.clientCompany.trim(),
      address: input.projectAddress.trim(),
      createdAt: now,
      updatedAt: now,
    });
  }

  const newLead: Lead = {
    id: `ld-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    clientName: sanitizeText(input.clientName),
    clientPhone: sanitizeText(input.clientPhone),
    clientEmail: input.clientEmail.trim().toLowerCase(),
    clientCompany: sanitizeText(input.clientCompany),
    projectAddress: sanitizeText(input.projectAddress),
    referralSource: sanitizeText(input.referralSource),
    stage: 'NEW_LEADS',
    firstNote: sanitizeText(input.firstNote || ''),
    contactLogs: [],
    attachments: [],
    estimateId: null,
    createdAt: now,
    updatedAt: now,
  };

  db.leads.unshift(newLead);
  await saveDatabase(db);

  await logActivity({
    actorId: caller.id,
    actorName: caller.name,
    actorEmail: caller.email,
    actorRole: caller.role,
    action: 'LEAD_CREATE',
    targetType: 'LEAD',
    targetId: newLead.id,
    details: `Created new sales lead for ${newLead.clientName} (${newLead.clientCompany}) at ${newLead.projectAddress}.`,
    ipAddress,
  });

  return newLead;
}

export async function updateLeadStage(
  caller: SafeUser,
  id: string,
  stage: LeadStage,
  ipAddress?: string
): Promise<Lead> {
  const db = await getDatabase();
  const lead = db.leads.find((l) => l.id === id);
  if (!lead) {
    throw new Error('Lead not found.');
  }

  const oldStage = lead.stage;
  lead.stage = stage;
  lead.updatedAt = new Date().toISOString();
  await saveDatabase(db);

  await logActivity({
    actorId: caller.id,
    actorName: caller.name,
    actorEmail: caller.email,
    actorRole: caller.role,
    action: 'LEAD_UPDATE',
    targetType: 'LEAD',
    targetId: lead.id,
    details: `Updated lead stage for ${lead.clientCompany} from ${oldStage} to ${stage}.`,
    ipAddress,
  });

  return lead;
}

export async function addContactLog(
  caller: SafeUser,
  id: string,
  input: AddContactLogInput,
  ipAddress?: string
): Promise<Lead> {
  const db = await getDatabase();
  const lead = db.leads.find((l) => l.id === id);
  if (!lead) {
    throw new Error('Lead not found.');
  }

  const now = new Date().toISOString();
  const newLog = {
    id: `cl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type: input.type,
    note: sanitizeText(input.note),
    timestamp: now,
    actorName: caller.name,
  };

  lead.contactLogs.unshift(newLog);
  lead.updatedAt = now;
  await saveDatabase(db);

  await logActivity({
    actorId: caller.id,
    actorName: caller.name,
    actorEmail: caller.email,
    actorRole: caller.role,
    action: 'LEAD_UPDATE',
    targetType: 'LEAD',
    targetId: lead.id,
    details: `Logged ${input.type} contact with ${lead.clientName}: "${input.note}".`,
    ipAddress,
  });

  return lead;
}

export async function addLeadAttachment(
  caller: SafeUser,
  id: string,
  input: AddLeadAttachmentInput,
  ipAddress?: string
): Promise<Lead> {
  const db = await getDatabase();
  const lead = db.leads.find((l) => l.id === id);
  if (!lead) {
    throw new Error('Lead not found.');
  }

  const now = new Date().toISOString();
  const newAttachment = {
    id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: sanitizeText(input.name),
    size: input.size,
    type: input.type,
    uploadedAt: now,
  };

  lead.attachments.push(newAttachment);
  lead.updatedAt = now;
  await saveDatabase(db);

  await logActivity({
    actorId: caller.id,
    actorName: caller.name,
    actorEmail: caller.email,
    actorRole: caller.role,
    action: 'LEAD_UPDATE',
    targetType: 'LEAD',
    targetId: lead.id,
    details: `Uploaded estimator file attachment "${newAttachment.name}" to lead ${lead.clientCompany}.`,
    ipAddress,
  });

  return lead;
}
