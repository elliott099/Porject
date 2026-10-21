export type UserRole = 'BOSS' | 'MANAGER' | 'EMPLOYEE';

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department: string;
  title: string;
  managerId: string | null;
  isActive: boolean;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserWithPassword extends User {
  passwordHash: string;
}

// DTO safe for client
export type SafeUser = Omit<UserWithPassword, 'passwordHash'>;

export interface TaskProgressNote {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string; // ISO date string
  assigneeId: string;
  creatorId: string;
  managerId: string; // The manager responsible for this employee/task
  progressNotes: TaskProgressNote[];
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWithDetails extends Task {
  assignee?: SafeUser;
  creator?: SafeUser;
}

export type ActionType =
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'DEMO_ROLE_SWITCH'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DEACTIVATE'
  | 'USER_REACTIVATE'
  | 'TASK_CREATE'
  | 'TASK_UPDATE'
  | 'TASK_STATUS_CHANGE'
  | 'TASK_DELETE'
  | 'PASSWORD_CHANGE'
  | 'SETTINGS_UPDATE'
  | 'LEAD_CREATE'
  | 'LEAD_UPDATE'
  | 'LEAD_SENT_TO_ESTIMATING'
  | 'ESTIMATE_CREATE'
  | 'ESTIMATE_UPDATE'
  | 'ESTIMATE_SENT'
  | 'ESTIMATE_WON'
  | 'PROJECT_CREATE'
  | 'PROJECT_UPDATE'
  | 'INVOICE_CREATE'
  | 'INVOICE_UPDATE'
  | 'TIMESHEET_CREATE'
  | 'TIMESHEET_APPROVE'
  | 'EXPENSE_CREATE';

export interface ActivityLog {
  id: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  actorRole: UserRole;
  action: ActionType;
  targetType: 'USER' | 'TASK' | 'AUTH' | 'SETTINGS' | 'LEAD' | 'ESTIMATE' | 'PROJECT' | 'INVOICE' | 'TIMESHEET';
  targetId: string;
  details: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  timestamp: string;
}

export interface CompanySettings {
  companyName: string;
  defaultTaskDeadlineDays: number;
  enforceManagerReview: boolean;
  allowEmployeeSelfAssignment: boolean;
  maintenanceMode: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface AuthSession {
  user: SafeUser;
  token: string;
  expiresAt: number;
}

export interface DashboardMetrics {
  totalStaff: number;
  activeManagers: number;
  activeEmployees: number;
  tasksTotal: number;
  tasksInProgress: number;
  tasksPending: number;
  tasksCompleted: number;
  tasksOverdue: number;
  completionRate: number; // percentage 0-100
  statusDistribution: {
    status: TaskStatus;
    label: string;
    count: number;
  }[];
  priorityDistribution: {
    priority: TaskPriority;
    label: string;
    count: number;
  }[];
  recentActivities: ActivityLog[];
  // New CRM & Project summary metrics
  totalLeadsCount?: number;
  activeInquiriesCount?: number;
  activeProjectsCount?: number;
  totalPipelineValue?: number;
}

// -------------------------------------------------------------
// CRM Leads & Clients
// -------------------------------------------------------------
export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export type LeadStage = 'NEW_LEADS' | 'QUALIFIED' | 'DRAFT' | 'SENT_TO_ESTIMATING';

export interface ContactLog {
  id: string;
  type: 'EMAIL' | 'CALL' | 'TEXT' | 'MEETING';
  note: string;
  timestamp: string;
  actorName: string;
}

export interface LeadAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
  uploadedAt: string;
}

export interface Lead {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientCompany: string;
  projectAddress: string;
  referralSource: string;
  stage: LeadStage;
  firstNote: string;
  contactLogs: ContactLog[];
  attachments: LeadAttachment[];
  estimateId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// -------------------------------------------------------------
// Estimates, Scope Templates & Proposal Builder
// -------------------------------------------------------------
export type PricingDisplayMode = 'LINE_ITEM' | 'SECTION' | 'TOTAL_ONLY' | 'SCOPE_ONLY';

export type EstimateStage =
  | 'NEW_INQUIRY'
  | 'DRAFTS'
  | 'QUOTE_CREATION'
  | 'SENT'
  | 'WON'
  | 'LOST'
  | 'ARCHIVE';

export interface ScopeItem {
  id: string;
  title: string;
  description: string;
  quantity: number;
  unit: string; // e.g. "Lump Sum", "Hours", "Units"
  unitPrice: number;
  total: number;
  isExclusion?: boolean;
}

export interface ScopeSection {
  id: string;
  name: string;
  items: ScopeItem[];
  subtotal: number;
}

export interface ScopeTemplate {
  id: string;
  name: string;
  description: string;
  sections: ScopeSection[];
  total: number;
  createdAt: string;
}

export interface Estimate {
  id: string;
  proposalNumber: string; // e.g. "AZ-2026-566"
  leadId?: string | null;
  clientName: string;
  clientEmail: string;
  clientCompany: string;
  clientPhone: string;
  projectAddress: string;
  projectName: string;
  stage: EstimateStage;
  proposalDate: string;
  validUntil: string;
  sections: ScopeSection[];
  internalCosts: {
    material: number;
    labour: number;
    licensingFee: number;
  };
  contingencyPercent: number;
  marginPercent: number;
  subtotal: number;
  contingencyAmount: number;
  marginAmount: number;
  total: number;
  pricingMode: PricingDisplayMode;
  notes: string;
  preparedBy: string;
  preparedByTitle: string;
  sentAt?: string | null;
  wonAt?: string | null;
  projectId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// -------------------------------------------------------------
// Projects, Invoicing, Timesheets, and Expenses
// -------------------------------------------------------------
export type ProjectPhase = 'PRECONSTRUCTION' | 'CONSTRUCTION' | 'CLOSEOUT';

export interface Invoice {
  id: string;
  projectId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  hst: number; // 13% HST or standard tax
  totalWithHst: number;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE';
  notes?: string;
  createdAt: string;
}

export interface Timesheet {
  id: string;
  projectId: string;
  projectName: string;
  employeeId: string;
  employeeName: string;
  date: string;
  hours: number;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt: string;
}

export interface Expense {
  id: string;
  projectId: string;
  type: 'MATERIAL' | 'REIMBURSEMENT';
  vendorOrEmployee: string;
  category: string;
  amount: number;
  receiptNote: string;
  date: string;
  submittedBy: string;
  createdAt: string;
}

export interface ProjectMilestone {
  id: string;
  title: string;
  targetDate: string;
  completed: boolean;
}

export interface Project {
  id: string;
  name: string;
  address: string;
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  clientPhone: string;
  estimateId?: string | null;
  proposalNumber?: string | null;
  contractValue: number;
  phase: ProjectPhase;
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';
  assignedPmId: string;
  assignedPmName: string;
  startDate: string;
  targetCompletionDate: string;
  milestones: ProjectMilestone[];
  invoices: Invoice[];
  timesheets: Timesheet[];
  expenses: Expense[];
  createdAt: string;
  updatedAt: string;
}

