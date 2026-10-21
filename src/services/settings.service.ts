import { getDatabase, saveDatabase } from '../lib/db/store.ts';
import { logActivity } from './audit.service.ts';
import type { CompanySettings, SafeUser } from '../types/index.ts';
import type { UpdateSettingsInput } from '../validations/settings.schema.ts';

export async function getCompanySettings(): Promise<CompanySettings> {
  const db = await getDatabase();
  return db.settings;
}

export async function updateCompanySettings(
  caller: SafeUser,
  input: UpdateSettingsInput,
  ipAddress?: string
): Promise<CompanySettings> {
  if (caller.role !== 'BOSS') {
    throw new Error('Forbidden: Only Boss/Admin can configure company governance settings.');
  }

  const db = await getDatabase();
  const now = new Date().toISOString();

  const updated: CompanySettings = {
    ...db.settings,
    companyName: input.companyName ?? db.settings.companyName,
    defaultTaskDeadlineDays:
      input.defaultTaskDeadlineDays ?? db.settings.defaultTaskDeadlineDays,
    enforceManagerReview:
      input.enforceManagerReview !== undefined
        ? input.enforceManagerReview
        : db.settings.enforceManagerReview,
    allowEmployeeSelfAssignment:
      input.allowEmployeeSelfAssignment !== undefined
        ? input.allowEmployeeSelfAssignment
        : db.settings.allowEmployeeSelfAssignment,
    maintenanceMode:
      input.maintenanceMode !== undefined
        ? input.maintenanceMode
        : db.settings.maintenanceMode,
    updatedAt: now,
    updatedBy: caller.id,
  };

  db.settings = updated;
  await saveDatabase(db);

  await logActivity({
    actorId: caller.id,
    actorName: caller.name,
    actorEmail: caller.email,
    actorRole: caller.role,
    action: 'SETTINGS_UPDATE',
    targetType: 'SETTINGS',
    targetId: 'global',
    details: `Updated enterprise company governance settings.`,
    ipAddress,
  });

  return updated;
}
