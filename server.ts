import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { signToken, verifyToken } from './src/lib/auth/jwt.ts';
import { checkRateLimit } from './src/lib/auth/rate-limit.ts';
import { comparePassword } from './src/lib/db/store.ts';
import {
  getUserByEmail,
  getUserById,
  getUsers,
  createUser,
  updateUser,
  changeUserPassword,
} from './src/services/user.service.ts';
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  employeeUpdateTask,
  deleteTask,
} from './src/services/task.service.ts';
import { getDashboardAnalytics } from './src/services/analytics.service.ts';
import { getActivityLogs, logActivity } from './src/services/audit.service.ts';
import { getCompanySettings, updateCompanySettings } from './src/services/settings.service.ts';
import {
  getClients,
  getLeads,
  getLeadById,
  createLead,
  updateLeadStage,
  addContactLog,
  addLeadAttachment,
} from './src/services/lead.service.ts';
import {
  getScopeTemplates,
  createScopeTemplate,
  getEstimates,
  getEstimateById,
  createEstimate,
  updateEstimate,
  sendEstimateToClient,
  acceptEstimateAndPromoteToProject,
  sendLeadToEstimating,
} from './src/services/estimate.service.ts';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProjectPhase,
  createInvoice,
  updateInvoiceStatus,
  createTimesheet,
  updateTimesheetStatus,
  createExpense,
} from './src/services/project.service.ts';
import {
  createLeadSchema,
  updateLeadStageSchema,
  addContactLogSchema,
  addLeadAttachmentSchema,
} from './src/validations/lead.schema.ts';
import {
  createEstimateSchema,
  updateEstimateSchema,
  createScopeTemplateSchema,
} from './src/validations/estimate.schema.ts';
import {
  createProjectSchema,
  updateProjectPhaseSchema,
  createInvoiceSchema,
  updateInvoiceStatusSchema,
  createTimesheetSchema,
  updateTimesheetStatusSchema,
  createExpenseSchema,
} from './src/validations/project.schema.ts';
import {
  loginSchema,
  changePasswordSchema,
} from './src/validations/auth.schema.ts';
import {
  createUserSchema,
  updateUserSchema,
} from './src/validations/user.schema.ts';
import {
  createTaskSchema,
  updateTaskSchema,
  employeeUpdateTaskSchema,
} from './src/validations/task.schema.ts';
import { updateSettingsSchema } from './src/validations/settings.schema.ts';
import type { SafeUser, UserRole } from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());
app.use(cookieParser());

// Extend express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
    }
  }
}

// Authentication middleware (reads HttpOnly cookie with Bearer token fallback)
async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token =
    req.cookies?.workpulse_auth ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: No active session token found.' });
    return;
  }

  const payload = await verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized: Session expired or invalid.' });
    return;
  }

  const user = await getUserById(payload.userId);
  if (!user || !user.isActive) {
    res.status(401).json({ error: 'Unauthorized: User account inactive or removed.' });
    return;
  }

  req.user = user;
  next();
}

// Role Authorization guard middleware
function requireRoles(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: Requires one of [${roles.join(', ')}] role privileges.`,
      });
      return;
    }
    next();
  };
}

// Helper to set cookie
function setAuthCookie(res: Response, token: string): void {
  res.cookie('workpulse_auth', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax', // compatible inside frames and standard navigation
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  });
}

// -----------------------------------------------------------------------------
// Authentication Endpoints
// -----------------------------------------------------------------------------

// POST /api/auth/login
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const rateKey = `login-${clientIp}`;
  const rate = checkRateLimit(rateKey, 10, 15 * 60 * 1000);

  if (!rate.allowed) {
    res.status(429).json({
      error: 'Too many authentication attempts. Please try again in 15 minutes.',
    });
    return;
  }

  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid login payload' });
    return;
  }

  const { email, password } = parsed.data;
  const user = await getUserByEmail(email);

  // Constant-time generic error to prevent email enumeration
  if (!user || !comparePassword(password, user.passwordHash) || !user.isActive) {
    res.status(401).json({ error: 'Invalid email credentials or account deactivated.' });
    return;
  }

  // Safe user without passwordHash
  const safeUser = await getUserById(user.id);
  if (!safeUser) {
    res.status(500).json({ error: 'Failed to retrieve user profile.' });
    return;
  }

  const token = await signToken(safeUser);
  setAuthCookie(res, token);

  await logActivity({
    actorId: safeUser.id,
    actorName: safeUser.name,
    actorEmail: safeUser.email,
    actorRole: safeUser.role,
    action: 'AUTH_LOGIN',
    targetType: 'AUTH',
    targetId: safeUser.id,
    details: `User logged in successfully via standard credentials.`,
    ipAddress: clientIp,
  });

  res.json({ user: safeUser, token });
});

// POST /api/auth/logout
app.post('/api/auth/logout', async (req: Request, res: Response) => {
  res.clearCookie('workpulse_auth', { path: '/' });
  res.json({ success: true, message: 'Logged out successfully.' });
});

// GET /api/auth/me
app.get('/api/auth/me', authenticate, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

// POST /api/auth/change-password
app.post('/api/auth/change-password', authenticate, async (req: Request, res: Response) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const rate = checkRateLimit(`pwd-${req.user!.id}`, 5, 15 * 60 * 1000);
  if (!rate.allowed) {
    res.status(429).json({ error: 'Too many password update attempts. Please wait.' });
    return;
  }

  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message });
    return;
  }

  try {
    await changeUserPassword(
      req.user!.id,
      parsed.data.currentPassword,
      parsed.data.newPassword,
      clientIp
    );
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update password.';
    res.status(400).json({ error: message });
  }
});

// -----------------------------------------------------------------------------
// User Management Endpoints
// -----------------------------------------------------------------------------

// GET /api/users
app.get('/api/users', authenticate, async (req: Request, res: Response) => {
  try {
    const users = await getUsers(req.user!);
    res.json({ users });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching users';
    res.status(500).json({ error: msg });
  }
});

// POST /api/users (Boss only)
app.post('/api/users', authenticate, requireRoles('BOSS'), async (req: Request, res: Response) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message });
    return;
  }

  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const newUser = await createUser(req.user!, parsed.data, clientIp);
    res.status(201).json({ user: newUser });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error creating user';
    res.status(400).json({ error: msg });
  }
});

// PATCH /api/users/:id
app.patch('/api/users/:id', authenticate, async (req: Request, res: Response) => {
  const targetId = req.params.id;
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message });
    return;
  }

  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const updated = await updateUser(req.user!, targetId, parsed.data, clientIp);
    res.json({ user: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error updating user';
    res.status(400).json({ error: msg });
  }
});

// -----------------------------------------------------------------------------
// Task Management Endpoints
// -----------------------------------------------------------------------------

// GET /api/tasks
app.get('/api/tasks', authenticate, async (req: Request, res: Response) => {
  try {
    const tasks = await getTasks(req.user!);
    res.json({ tasks });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching tasks';
    res.status(500).json({ error: msg });
  }
});

// GET /api/tasks/:id
app.get('/api/tasks/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const task = await getTaskById(req.user!, req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }
    res.json({ task });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching task';
    res.status(403).json({ error: msg });
  }
});

// POST /api/tasks (Boss & Manager only; Manager can only assign to team)
app.post(
  '/api/tasks',
  authenticate,
  requireRoles('BOSS', 'MANAGER'),
  async (req: Request, res: Response) => {
    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message });
      return;
    }

    try {
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const created = await createTask(req.user!, parsed.data, clientIp);
      res.status(201).json({ task: created });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create task';
      res.status(403).json({ error: msg });
    }
  }
);

// PATCH /api/tasks/:id (Manager / Boss updates metadata)
app.patch('/api/tasks/:id', authenticate, async (req: Request, res: Response) => {
  // If the user is an employee, they must use the progress endpoint!
  if (req.user!.role === 'EMPLOYEE') {
    res.status(403).json({
      error:
        'Forbidden: Employees cannot alter task definitions. Use /api/tasks/:id/progress to submit updates.',
    });
    return;
  }

  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message });
    return;
  }

  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const updated = await updateTask(req.user!, req.params.id, parsed.data, clientIp);
    res.json({ task: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update task';
    res.status(403).json({ error: msg });
  }
});

// PATCH /api/tasks/:id/progress (Employee Interactive Task Execution with Field Whitelist)
app.patch('/api/tasks/:id/progress', authenticate, async (req: Request, res: Response) => {
  const parsed = employeeUpdateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message });
    return;
  }

  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const updated = await employeeUpdateTask(
      req.user!,
      req.params.id,
      req.body as Record<string, unknown>,
      parsed.data,
      clientIp
    );
    res.json({ task: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to submit task progress';
    res.status(400).json({ error: msg });
  }
});

// DELETE /api/tasks/:id
app.delete('/api/tasks/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    await deleteTask(req.user!, req.params.id, clientIp);
    res.json({ success: true, message: 'Task deleted successfully.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete task';
    res.status(403).json({ error: msg });
  }
});

// -----------------------------------------------------------------------------
// Analytics & Governance Endpoints
// -----------------------------------------------------------------------------

// GET /api/analytics
app.get('/api/analytics', authenticate, async (req: Request, res: Response) => {
  try {
    const metrics = await getDashboardAnalytics(req.user!);
    res.json({ metrics });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load metrics';
    res.status(500).json({ error: msg });
  }
});

// GET /api/audit-logs (Boss only)
app.get(
  '/api/audit-logs',
  authenticate,
  requireRoles('BOSS'),
  async (_req: Request, res: Response) => {
    try {
      const logs = await getActivityLogs(150);
      res.json({ logs });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load audit logs';
      res.status(500).json({ error: msg });
    }
  }
);

// GET /api/settings
app.get('/api/settings', authenticate, async (_req: Request, res: Response) => {
  try {
    const settings = await getCompanySettings();
    res.json({ settings });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load settings';
    res.status(500).json({ error: msg });
  }
});

// -----------------------------------------------------------------------------
// Clients & Leads Endpoints (Boss & Manager)
// -----------------------------------------------------------------------------

// GET /api/clients
app.get(
  '/api/clients',
  authenticate,
  requireRoles('BOSS', 'MANAGER'),
  async (_req: Request, res: Response) => {
    try {
      const clients = await getClients();
      res.json({ clients });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch clients';
      res.status(500).json({ error: msg });
    }
  }
);

// GET /api/leads
app.get(
  '/api/leads',
  authenticate,
  requireRoles('BOSS', 'MANAGER'),
  async (_req: Request, res: Response) => {
    try {
      const leads = await getLeads();
      res.json({ leads });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch leads';
      res.status(500).json({ error: msg });
    }
  }
);

// GET /api/leads/:id
app.get(
  '/api/leads/:id',
  authenticate,
  requireRoles('BOSS', 'MANAGER'),
  async (req: Request, res: Response) => {
    try {
      const lead = await getLeadById(req.params.id);
      if (!lead) {
        res.status(404).json({ error: 'Lead not found.' });
        return;
      }
      res.json({ lead });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch lead';
      res.status(500).json({ error: msg });
    }
  }
);

// POST /api/leads
app.post(
  '/api/leads',
  authenticate,
  requireRoles('BOSS', 'MANAGER'),
  async (req: Request, res: Response) => {
    const parsed = createLeadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message });
      return;
    }

    try {
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const created = await createLead(req.user!, parsed.data, clientIp);
      res.status(201).json({ lead: created });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create lead';
      res.status(400).json({ error: msg });
    }
  }
);

// PATCH /api/leads/:id/stage
app.patch(
  '/api/leads/:id/stage',
  authenticate,
  requireRoles('BOSS', 'MANAGER'),
  async (req: Request, res: Response) => {
    const parsed = updateLeadStageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message });
      return;
    }

    try {
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const updated = await updateLeadStage(req.user!, req.params.id, parsed.data.stage, clientIp);
      res.json({ lead: updated });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update lead stage';
      res.status(400).json({ error: msg });
    }
  }
);

// POST /api/leads/:id/contact
app.post(
  '/api/leads/:id/contact',
  authenticate,
  requireRoles('BOSS', 'MANAGER'),
  async (req: Request, res: Response) => {
    const parsed = addContactLogSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message });
      return;
    }

    try {
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const updated = await addContactLog(req.user!, req.params.id, parsed.data, clientIp);
      res.json({ lead: updated });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to log contact';
      res.status(400).json({ error: msg });
    }
  }
);

// POST /api/leads/:id/attachments
app.post(
  '/api/leads/:id/attachments',
  authenticate,
  requireRoles('BOSS', 'MANAGER'),
  async (req: Request, res: Response) => {
    const parsed = addLeadAttachmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message });
      return;
    }

    try {
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const updated = await addLeadAttachment(req.user!, req.params.id, parsed.data, clientIp);
      res.json({ lead: updated });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add attachment';
      res.status(400).json({ error: msg });
    }
  }
);

// POST /api/leads/:id/send-to-estimating
app.post(
  '/api/leads/:id/send-to-estimating',
  authenticate,
  requireRoles('BOSS', 'MANAGER'),
  async (req: Request, res: Response) => {
    try {
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const result = await sendLeadToEstimating(req.user!, req.params.id, clientIp);
      res.json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send lead to estimating';
      res.status(400).json({ error: msg });
    }
  }
);

// -----------------------------------------------------------------------------
// Scope Templates & Estimates Endpoints (Boss & Manager)
// -----------------------------------------------------------------------------

// GET /api/scope-templates
app.get(
  '/api/scope-templates',
  authenticate,
  requireRoles('BOSS', 'MANAGER'),
  async (_req: Request, res: Response) => {
    try {
      const templates = await getScopeTemplates();
      res.json({ templates });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch templates';
      res.status(500).json({ error: msg });
    }
  }
);

// POST /api/scope-templates
app.post(
  '/api/scope-templates',
  authenticate,
  requireRoles('BOSS', 'MANAGER'),
  async (req: Request, res: Response) => {
    const parsed = createScopeTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message });
      return;
    }

    try {
      const created = await createScopeTemplate(req.user!, parsed.data);
      res.status(201).json({ template: created });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save template';
      res.status(400).json({ error: msg });
    }
  }
);

// GET /api/estimates
app.get(
  '/api/estimates',
  authenticate,
  requireRoles('BOSS', 'MANAGER'),
  async (_req: Request, res: Response) => {
    try {
      const estimates = await getEstimates();
      res.json({ estimates });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch estimates';
      res.status(500).json({ error: msg });
    }
  }
);

// GET /api/estimates/:id
app.get(
  '/api/estimates/:id',
  authenticate,
  requireRoles('BOSS', 'MANAGER'),
  async (req: Request, res: Response) => {
    try {
      const estimate = await getEstimateById(req.params.id);
      if (!estimate) {
        res.status(404).json({ error: 'Estimate not found.' });
        return;
      }
      res.json({ estimate });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch estimate';
      res.status(500).json({ error: msg });
    }
  }
);

// POST /api/estimates
app.post(
  '/api/estimates',
  authenticate,
  requireRoles('BOSS', 'MANAGER'),
  async (req: Request, res: Response) => {
    const parsed = createEstimateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message });
      return;
    }

    try {
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const created = await createEstimate(req.user!, parsed.data, clientIp);
      res.status(201).json({ estimate: created });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create estimate';
      res.status(400).json({ error: msg });
    }
  }
);

// PATCH /api/estimates/:id
app.patch(
  '/api/estimates/:id',
  authenticate,
  requireRoles('BOSS', 'MANAGER'),
  async (req: Request, res: Response) => {
    const parsed = updateEstimateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message });
      return;
    }

    try {
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const updated = await updateEstimate(req.user!, req.params.id, parsed.data, clientIp);
      res.json({ estimate: updated });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update estimate';
      res.status(400).json({ error: msg });
    }
  }
);

// POST /api/estimates/:id/send
app.post(
  '/api/estimates/:id/send',
  authenticate,
  requireRoles('BOSS', 'MANAGER'),
  async (req: Request, res: Response) => {
    const { to, subject, body } = req.body;
    if (!to || !subject) {
      res.status(400).json({ error: 'Recipient email and subject are required.' });
      return;
    }

    try {
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const sent = await sendEstimateToClient(req.user!, req.params.id, { to, subject, body }, clientIp);
      res.json({ estimate: sent });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send estimate';
      res.status(400).json({ error: msg });
    }
  }
);

// POST /api/estimates/:id/accept
app.post(
  '/api/estimates/:id/accept',
  authenticate,
  requireRoles('BOSS', 'MANAGER'),
  async (req: Request, res: Response) => {
    try {
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const result = await acceptEstimateAndPromoteToProject(req.user!, req.params.id, clientIp);
      res.json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to accept estimate';
      res.status(400).json({ error: msg });
    }
  }
);

// -----------------------------------------------------------------------------
// Projects, Invoices, Timesheets, and Expenses Endpoints
// -----------------------------------------------------------------------------

// GET /api/projects
app.get('/api/projects', authenticate, async (req: Request, res: Response) => {
  try {
    const projects = await getProjects(req.user!);
    res.json({ projects });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch projects';
    res.status(500).json({ error: msg });
  }
});

// GET /api/projects/:id
app.get('/api/projects/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const project = await getProjectById(req.user!, req.params.id);
    if (!project) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }
    res.json({ project });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch project';
    res.status(500).json({ error: msg });
  }
});

// POST /api/projects (Boss & Manager only)
app.post(
  '/api/projects',
  authenticate,
  requireRoles('BOSS', 'MANAGER'),
  async (req: Request, res: Response) => {
    const parsed = createProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message });
      return;
    }

    try {
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const created = await createProject(req.user!, parsed.data, clientIp);
      res.status(201).json({ project: created });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create project';
      res.status(400).json({ error: msg });
    }
  }
);

// PATCH /api/projects/:id/phase
app.patch(
  '/api/projects/:id/phase',
  authenticate,
  requireRoles('BOSS', 'MANAGER'),
  async (req: Request, res: Response) => {
    const parsed = updateProjectPhaseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message });
      return;
    }

    try {
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const updated = await updateProjectPhase(req.user!, req.params.id, parsed.data, clientIp);
      res.json({ project: updated });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update project phase';
      res.status(400).json({ error: msg });
    }
  }
);

// POST /api/projects/:id/invoices (Boss & Manager only)
app.post(
  '/api/projects/:id/invoices',
  authenticate,
  requireRoles('BOSS', 'MANAGER'),
  async (req: Request, res: Response) => {
    const parsed = createInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message });
      return;
    }

    try {
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const created = await createInvoice(req.user!, req.params.id, parsed.data, clientIp);
      res.status(201).json({ invoice: created });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create invoice';
      res.status(400).json({ error: msg });
    }
  }
);

// PATCH /api/projects/:id/invoices/:invId (Boss & Manager only)
app.patch(
  ['/api/projects/:id/invoices/:invId', '/api/projects/:id/invoices/:invId/status'],
  authenticate,
  requireRoles('BOSS', 'MANAGER'),
  async (req: Request, res: Response) => {
    const parsed = updateInvoiceStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message });
      return;
    }

    try {
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const updated = await updateInvoiceStatus(
        req.user!,
        req.params.id,
        req.params.invId,
        parsed.data,
        clientIp
      );
      res.json({ invoice: updated });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update invoice';
      res.status(400).json({ error: msg });
    }
  }
);

// POST /api/projects/:id/timesheets (All authenticated users can log time)
app.post(
  '/api/projects/:id/timesheets',
  authenticate,
  async (req: Request, res: Response) => {
    const parsed = createTimesheetSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message });
      return;
    }

    try {
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const created = await createTimesheet(req.user!, req.params.id, parsed.data, clientIp);
      res.status(201).json({ timesheet: created });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create timesheet';
      res.status(400).json({ error: msg });
    }
  }
);

// PATCH /api/projects/:id/timesheets/:tsId (Boss & Manager approve/reject)
app.patch(
  ['/api/projects/:id/timesheets/:tsId', '/api/projects/:id/timesheets/:tsId/status'],
  authenticate,
  requireRoles('BOSS', 'MANAGER'),
  async (req: Request, res: Response) => {
    const parsed = updateTimesheetStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message });
      return;
    }

    try {
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const updated = await updateTimesheetStatus(
        req.user!,
        req.params.id,
        req.params.tsId,
        parsed.data,
        clientIp
      );
      res.json({ timesheet: updated });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update timesheet';
      res.status(400).json({ error: msg });
    }
  }
);

// POST /api/projects/:id/expenses (All authenticated users can log material or reimbursement expense)
app.post(
  '/api/projects/:id/expenses',
  authenticate,
  async (req: Request, res: Response) => {
    const parsed = createExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message });
      return;
    }

    try {
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const created = await createExpense(req.user!, req.params.id, parsed.data, clientIp);
      res.status(201).json({ expense: created });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record expense';
      res.status(400).json({ error: msg });
    }
  }
);

// -----------------------------------------------------------------------------
// Vite Middleware / Static Serving
// -----------------------------------------------------------------------------
async function bootstrapServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[WorkPulse Server] Running on http://0.0.0.0:${PORT} (Mode: ${process.env.NODE_ENV || 'development'})`);
  });
}

bootstrapServer().catch((err) => {
  console.error('Failed to start WorkPulse server:', err);
  process.exit(1);
});
