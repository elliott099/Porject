import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { LoginView } from './components/auth/LoginView.tsx';
import { Sidebar } from './components/layout/Sidebar.tsx';
import { TopNav } from './components/layout/TopNav.tsx';
import { KPICards } from './components/dashboard/KPICards.tsx';
import { StatusChart } from './components/dashboard/StatusChart.tsx';
import { PriorityChart } from './components/dashboard/PriorityChart.tsx';
import { RecentActivityFeed } from './components/dashboard/RecentActivityFeed.tsx';
import { TaskFilters, FilterStatus } from './components/tasks/TaskFilters.tsx';
import { TaskTable } from './components/tasks/TaskTable.tsx';
import { TaskFormModal } from './components/tasks/TaskFormModal.tsx';
import { TaskProgressModal } from './components/tasks/TaskProgressModal.tsx';
import { EmployeeTable } from './components/employees/EmployeeTable.tsx';
import { HierarchyTree } from './components/employees/HierarchyTree.tsx';
import { EmployeeModal } from './components/employees/EmployeeModal.tsx';
import { AuditLogTable } from './components/audit/AuditLogTable.tsx';
import { SettingsView } from './components/settings/SettingsView.tsx';
import { ConfirmDialog } from './components/ui/ConfirmDialog.tsx';
import { ToastContainer, ToastMessage } from './components/ui/Toast.tsx';
import { LeadManagerView } from './components/leads/LeadManagerView.tsx';
import { LeadModal } from './components/leads/LeadModal.tsx';
import { EstimatesView } from './components/estimates/EstimatesView.tsx';
import { ProjectsView } from './components/projects/ProjectsView.tsx';
import { ProjectModal } from './components/projects/ProjectModal.tsx';
import { isTaskOverdue, canAccessRoute } from './shared/permissions.ts';
import {Cursor} from 'codxell-cursor';

import type {
  TaskWithDetails,
  SafeUser,
  DashboardMetrics,
  ActivityLog,
  Lead,
  Client,
  Estimate,
  ScopeTemplate,
  Project,
} from './types/index.ts';
import { Plus, Users, GitFork, RefreshCw, Layers, Calculator, Briefcase } from 'lucide-react';

function MainApp() {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Core Data states
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [auditLogs, setAuditLogs] = useState<ActivityLog[]>([]);

  // CRM, Estimates, Projects Data states
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [templates, setTemplates] = useState<ScopeTemplate[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [dataLoading, setDataLoading] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Task Filter state
  const [taskStatusFilter, setTaskStatusFilter] = useState<FilterStatus>('ALL');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState('ALL');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');

  // Modals state
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<TaskWithDetails | null>(null);

  const [taskProgressOpen, setTaskProgressOpen] = useState(false);
  const [selectedTaskForProgress, setSelectedTaskForProgress] = useState<TaskWithDetails | null>(null);

  const [deleteTaskDialog, setDeleteTaskDialog] = useState<{
    open: boolean;
    task: TaskWithDetails | null;
  }>({ open: false, task: null });

  // Quick Action Global Modals
  const [quickLeadModalOpen, setQuickLeadModalOpen] = useState(false);
  const [quickProjectModalOpen, setQuickProjectModalOpen] = useState(false);

  // Employee Directory state
  const [employeeSubTab, setEmployeeSubTab] = useState<'directory' | 'hierarchy'>('directory');
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [selectedEmployeeForEdit, setSelectedEmployeeForEdit] = useState<SafeUser | null>(null);
  const [toggleActiveDialog, setToggleActiveDialog] = useState<{
    open: boolean;
    user: SafeUser | null;
  }>({ open: false, user: null });

  // Fetch all core application data
  const loadData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);

    try {
      // 1. Tasks
      const tasksRes = await fetch('/api/tasks');
      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data.tasks || []);
      }

      // 2. Metrics
      const metricsRes = await fetch('/api/analytics');
      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data.metrics || null);
      }

      // 3. Projects (Accessible to all roles, scoped on backend)
      const projectsRes = await fetch('/api/projects');
      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjects(data.projects || []);
      }

      // 4. Sales & CRM (Boss & Manager)
      if (user.role === 'BOSS' || user.role === 'MANAGER') {
        const [leadsRes, clientsRes, estimatesRes, templatesRes, usersRes] = await Promise.all([
          fetch('/api/leads'),
          fetch('/api/clients'),
          fetch('/api/estimates'),
          fetch('/api/scope-templates'),
          fetch('/api/users'),
        ]);

        if (leadsRes.ok) {
          const data = await leadsRes.json();
          setLeads(data.leads || []);
        }
        if (clientsRes.ok) {
          const data = await clientsRes.json();
          setClients(data.clients || []);
        }
        if (estimatesRes.ok) {
          const data = await estimatesRes.json();
          setEstimates(data.estimates || []);
        }
        if (templatesRes.ok) {
          const data = await templatesRes.json();
          setTemplates(data.templates || []);
        }
        if (usersRes.ok) {
          const data = await usersRes.json();
          setUsers(data.users || []);
        }
      }

      // 5. Audit Logs (Boss only)
      if (user.role === 'BOSS') {
        const logsRes = await fetch('/api/audit-logs');
        if (logsRes.ok) {
          const data = await logsRes.json();
          setAuditLogs(data.logs || []);
        }
      }
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      // Check route RBAC
      if (!canAccessRoute(user.role, `/${currentTab}`)) {
        setCurrentTab('dashboard');
      }
      loadData();
    }
  }, [user, currentTab, loadData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
          <span className="text-xs text-slate-500 font-medium">Loading WorkPulse Session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const overdue = isTaskOverdue(t);

    if (taskStatusFilter === 'PENDING' && t.status !== 'PENDING') return false;
    if (taskStatusFilter === 'IN_PROGRESS' && t.status !== 'IN_PROGRESS') return false;
    if (taskStatusFilter === 'COMPLETED' && t.status !== 'COMPLETED') return false;
    if (taskStatusFilter === 'OVERDUE' && !overdue) return false;

    if (taskPriorityFilter !== 'ALL' && t.priority !== taskPriorityFilter) return false;

    if (taskSearchQuery.trim()) {
      const q = taskSearchQuery.toLowerCase();
      const match =
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.assignee?.name && t.assignee.name.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  const taskCounts = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === 'PENDING').length,
    inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    completed: tasks.filter((t) => t.status === 'COMPLETED').length,
    overdue: tasks.filter((t) => isTaskOverdue(t)).length,
  };

  // Badge count for new estimate inquiries
  const newInquiriesCount = estimates.filter((e) => e.stage === 'NEW_INQUIRY').length;

  // Handlers for Task Deletion
  const handleDeleteTaskConfirm = async () => {
    if (!deleteTaskDialog.task) return;
    try {
      const res = await fetch(`/api/tasks/${deleteTaskDialog.task.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete task');
      }
      showToast('Task deleted successfully');
      setDeleteTaskDialog({ open: false, task: null });
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error deleting task', 'error');
    }
  };

  // Handlers for User Deactivation
  const handleToggleUserActive = async () => {
    if (!toggleActiveDialog.user) return;
    const target = toggleActiveDialog.user;
    try {
      const res = await fetch(`/api/users/${target.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !target.isActive }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update user status');
      }
      showToast(`User ${target.isActive ? 'deactivated' : 'reactivated'} successfully`);
      setToggleActiveDialog({ open: false, user: null });
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error updating user', 'error');
    }
  };

  // Global Quick Action handler
  const handleQuickAction = (action: 'lead' | 'estimate' | 'project' | 'task') => {
    if (action === 'lead') {
      setQuickLeadModalOpen(true);
    } else if (action === 'estimate') {
      setCurrentTab('estimates');
    } else if (action === 'project') {
      setQuickProjectModalOpen(true);
    } else if (action === 'task') {
      setSelectedTaskForEdit(null);
      setTaskFormOpen(true);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans">
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        inquiriesBadgeCount={newInquiriesCount}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav
          currentTab={currentTab}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onQuickAction={handleQuickAction}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* TAB 1: DASHBOARD */}
          {currentTab === 'dashboard' && metrics && (
            <div className="space-y-6">
              {/* Header Title & Subtitle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    {user.role === 'BOSS'
                      ? 'Executive Command Center'
                      : user.role === 'MANAGER'
                      ? 'Team Operations Dashboard'
                      : 'My Personal Workspace'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {user.role === 'BOSS'
                      ? 'Organization-wide real-time throughput, SLA health, CRM pipeline, and projects'
                      : user.role === 'MANAGER'
                      ? `Supervisory metrics strictly scoped to direct reports under ${user.name}`
                      : `Assigned deliverables and live execution status for ${user.name}`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={loadData}
                    disabled={dataLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${dataLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* KPI Cards */}
              <KPICards metrics={metrics} role={user.role} />

              {/* CRM & Project Operations Quick Overview Banner */}
              {(user.role === 'BOSS' || user.role === 'MANAGER') && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div
                    onClick={() => setCurrentTab('leads')}
                    className="p-4 bg-white border border-slate-200 hover:border-indigo-400 rounded-xl shadow-2xs cursor-pointer transition-all space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-500">Active CRM Leads</span>
                      <Users className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="text-xl font-bold text-slate-900">{leads.length}</div>
                    <div className="text-[11px] text-slate-400">
                      {leads.filter((l) => l.stage === 'DRAFT').length} in draft scope
                    </div>
                  </div>

                  <div
                    onClick={() => setCurrentTab('estimates')}
                    className="p-4 bg-white border border-slate-200 hover:border-indigo-400 rounded-xl shadow-2xs cursor-pointer transition-all space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-500">Estimates &amp; Proposals</span>
                      <Calculator className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <span>{estimates.length}</span>
                      {newInquiriesCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full">
                          {newInquiriesCount} new inquiry
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Pipeline total: $
                      {estimates
                        .reduce((sum, e) => sum + e.total, 0)
                        .toLocaleString('en-US', { minimumFractionDigits: 0 })}
                    </div>
                  </div>

                  <div
                    onClick={() => setCurrentTab('projects')}
                    className="p-4 bg-white border border-slate-200 hover:border-indigo-400 rounded-xl shadow-2xs cursor-pointer transition-all space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-500">Live Projects</span>
                      <Briefcase className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="text-xl font-bold text-slate-900">{projects.length}</div>
                    <div className="text-[11px] text-slate-400">
                      Portfolio: $
                      {projects
                        .reduce((sum, p) => sum + p.contractValue, 0)
                        .toLocaleString('en-US', { minimumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>
              )}

              {/* Visualizations Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Donut Chart */}
                <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <div className="mb-2">
                    <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      Task Status Distribution
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Breakdown of active deliverables across completion phases
                    </p>
                  </div>
                  <StatusChart data={metrics.statusDistribution} />
                </div>

                {/* Priority Bar Chart */}
                <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <div className="mb-2">
                    <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      Workload by Priority
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Distribution of tasks categorized by operational urgency
                    </p>
                  </div>
                  <PriorityChart data={metrics.priorityDistribution} />
                </div>
              </div>

              {/* Recent Activity Logs */}
              <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="mb-3">
                  <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                    Recent Verified Operations
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Latest status changes, proposals, invoices, and task executions
                  </p>
                </div>
                <RecentActivityFeed logs={metrics.recentActivities} />
              </div>
            </div>
          )}

          {/* TAB 2: CRM LEADS (Boss & Manager) */}
          {currentTab === 'leads' && (user.role === 'BOSS' || user.role === 'MANAGER') && (
            <LeadManagerView
              leads={leads}
              clients={clients}
              onRefresh={loadData}
              onNavigateToEstimates={() => setCurrentTab('estimates')}
            />
          )}

          {/* TAB 3: ESTIMATES & PROPOSAL BUILDER (Boss & Manager) */}
          {currentTab === 'estimates' && (user.role === 'BOSS' || user.role === 'MANAGER') && (
            <EstimatesView
              estimates={estimates}
              templates={templates}
              currentUser={user}
              onRefresh={loadData}
              onNavigateToProjects={() => setCurrentTab('projects')}
            />
          )}

          {/* TAB 4: PROJECTS, SCHEDULE, INVOICING, TIMESHEETS, EXPENSES */}
          {currentTab === 'projects' && (
            <ProjectsView
              projects={projects}
              currentUser={user}
              availableUsers={users}
              onRefresh={loadData}
            />
          )}

          {/* TAB 5: TASKS */}
          {currentTab === 'tasks' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    Task Management &amp; Execution
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {user.role === 'EMPLOYEE'
                      ? 'Select an assigned task to log progress notes and transition delivery status.'
                      : 'Define deliverables, track team throughput, and supervise SLA schedules.'}
                  </p>
                </div>

                {user.role !== 'EMPLOYEE' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTaskForEdit(null);
                      setTaskFormOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Task</span>
                  </button>
                )}
              </div>

              {/* Filters */}
              <TaskFilters
                statusFilter={taskStatusFilter}
                onStatusChange={setTaskStatusFilter}
                priorityFilter={taskPriorityFilter}
                onPriorityChange={setTaskPriorityFilter}
                searchQuery={taskSearchQuery}
                onSearchChange={setTaskSearchQuery}
                counts={taskCounts}
              />

              {/* Table */}
              <TaskTable
                tasks={filteredTasks}
                role={user.role}
                onEditTask={(task) => {
                  setSelectedTaskForEdit(task);
                  setTaskFormOpen(true);
                }}
                onDeleteTask={(task) => {
                  setDeleteTaskDialog({ open: true, task });
                }}
                onProgressTask={(task) => {
                  setSelectedTaskForProgress(task);
                  setTaskProgressOpen(true);
                }}
              />
            </div>
          )}

          {/* TAB 6: EMPLOYEES & HIERARCHY (Boss & Manager) */}
          {currentTab === 'employees' && (user.role === 'BOSS' || user.role === 'MANAGER') && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    Personnel Directory &amp; Hierarchy
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {user.role === 'BOSS'
                      ? 'Enterprise personnel administration, supervisory mappings, and account provisioning'
                      : 'Direct reporting tree and personnel under your engineering management'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Sub-tab switcher */}
                  <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setEmployeeSubTab('directory')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        employeeSubTab === 'directory'
                          ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Directory</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmployeeSubTab('hierarchy')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        employeeSubTab === 'hierarchy'
                          ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <GitFork className="w-3.5 h-3.5" />
                      <span>Hierarchy Tree</span>
                    </button>
                  </div>

                  {user.role === 'BOSS' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEmployeeForEdit(null);
                        setEmployeeModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Employee</span>
                    </button>
                  )}
                </div>
              </div>

              {employeeSubTab === 'directory' ? (
                <EmployeeTable
                  users={users}
                  role={user.role}
                  onEdit={(target) => {
                    setSelectedEmployeeForEdit(target);
                    setEmployeeModalOpen(true);
                  }}
                  onToggleActive={(target) => {
                    setToggleActiveDialog({ open: true, user: target });
                  }}
                />
              ) : (
                <HierarchyTree users={users} />
              )}
            </div>
          )}

          {/* TAB 7: AUDIT LOGS (Boss only) */}
          {currentTab === 'audit-logs' && user.role === 'BOSS' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Immutable Administrative Audit Trail
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Append-only compliance log capturing user creation, status changes, task mutations, and session authentications
                </p>
              </div>

              <AuditLogTable logs={auditLogs} />
            </div>
          )}

          {/* TAB 8: SETTINGS */}
          {currentTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Governance &amp; Profile Settings
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage personal authentication credentials and enterprise operational policies
                </p>
              </div>

              <SettingsView onShowToast={showToast} />
            </div>
          )}
        </main>
      </div>

      {/* Task Creation / Edit Modal */}
      <TaskFormModal
        task={selectedTaskForEdit}
        isOpen={taskFormOpen}
        onClose={() => {
          setTaskFormOpen(false);
          setSelectedTaskForEdit(null);
        }}
        onSuccess={() => {
          showToast(selectedTaskForEdit ? 'Task updated' : 'Task provisioned');
          loadData();
        }}
        availableUsers={users.filter(
          (u) => u.isActive && (user.role === 'BOSS' || u.managerId === user.id)
        )}
      />

      {/* Employee Interactive Progress Modal */}
      <TaskProgressModal
        task={selectedTaskForProgress}
        isOpen={taskProgressOpen}
        onClose={() => {
          setTaskProgressOpen(false);
          setSelectedTaskForProgress(null);
        }}
        onSuccess={() => {
          showToast('Task progress submitted successfully');
          loadData();
        }}
      />

      {/* Quick Action: Lead Modal */}
      <LeadModal
        isOpen={quickLeadModalOpen}
        onClose={() => setQuickLeadModalOpen(false)}
        onSuccess={() => {
          showToast('Sales lead created in pipeline');
          loadData();
          setCurrentTab('leads');
        }}
        clients={clients}
      />

      {/* Quick Action: Project Modal */}
      <ProjectModal
        isOpen={quickProjectModalOpen}
        onClose={() => setQuickProjectModalOpen(false)}
        onSuccess={() => {
          showToast('Project provisioned successfully');
          loadData();
          setCurrentTab('projects');
        }}
        availableUsers={users}
      />

      {/* Task Deletion Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteTaskDialog.open}
        onClose={() => setDeleteTaskDialog({ open: false, task: null })}
        onConfirm={handleDeleteTaskConfirm}
        title="Delete Task Deliverable"
        message={`Are you sure you want to delete "${deleteTaskDialog.task?.title}"? This action cannot be reversed.`}
        confirmLabel="Delete Task"
        isDestructive
      />

      {/* User Creation / Edit Modal */}
      <EmployeeModal
        user={selectedEmployeeForEdit}
        isOpen={employeeModalOpen}
        onClose={() => {
          setEmployeeModalOpen(false);
          setSelectedEmployeeForEdit(null);
        }}
        onSuccess={() => {
          showToast(selectedEmployeeForEdit ? 'Employee updated' : 'Employee provisioned');
          loadData();
        }}
        allUsers={users}
      />

      {/* User Deactivation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={toggleActiveDialog.open}
        onClose={() => setToggleActiveDialog({ open: false, user: null })}
        onConfirm={handleToggleUserActive}
        title={toggleActiveDialog.user?.isActive ? 'Deactivate Account' : 'Reactivate Account'}
        message={
          toggleActiveDialog.user?.isActive
            ? `Deactivating ${toggleActiveDialog.user?.name} will revoke their active JWT session and access privileges.`
            : `Reactivate access privileges for ${toggleActiveDialog.user?.name}?`
        }
        confirmLabel={toggleActiveDialog.user?.isActive ? 'Deactivate Account' : 'Reactivate Account'}
        isDestructive={Boolean(toggleActiveDialog.user?.isActive)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Cursor bg='magic'/>
      <MainApp />
    </AuthProvider>
  );
}
