import React, { useState } from 'react';
import type {
  Project,
  ProjectPhase,
  Invoice,
  Timesheet,
  Expense,
  SafeUser,
} from '../../types/index.ts';
import { InvoiceModal } from './InvoiceModal.tsx';
import { TimesheetModal } from './TimesheetModal.tsx';
import { ExpenseModal } from './ExpenseModal.tsx';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Clock,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Plus,
  Send,
  Building2,
  MapPin,
  User,
  CheckSquare,
  Square,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface ProjectWorkspaceProps {
  project: Project;
  currentUser: SafeUser;
  onBack: () => void;
  onRefresh: () => void;
}

export function ProjectWorkspace({
  project,
  currentUser,
  onBack,
  onRefresh,
}: ProjectWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<
    'schedule' | 'invoicing' | 'timesheets' | 'expenses'
  >('schedule');

  // Modals
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [timesheetModalOpen, setTimesheetModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);

  // New milestone state
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  );

  const [updating, setUpdating] = useState(false);

  // Phase transition
  const handlePhaseChange = async (phase: ProjectPhase) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/phase`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error changing phase:', err);
    } finally {
      setUpdating(false);
    }
  };

  // Milestone toggling
  const handleToggleMilestone = async (milestoneId: string, currentVal: boolean) => {
    const updatedMilestones = project.milestones.map((m) =>
      m.id === milestoneId ? { ...m, completed: !currentVal } : m
    );

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestones: updatedMilestones }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error updating milestone:', err);
    }
  };

  // Add new milestone
  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim()) return;

    const newM = {
      id: `ms-${Date.now()}`,
      title: newMilestoneTitle.trim(),
      targetDate: new Date(newMilestoneDate).toISOString(),
      completed: false,
    };

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestones: [...project.milestones, newM] }),
      });
      if (res.ok) {
        setNewMilestoneTitle('');
        onRefresh();
      }
    } catch (err) {
      console.error('Error adding milestone:', err);
    }
  };

  // Invoice status transition (Sent / Paid)
  const handleInvoiceStatus = async (invoiceId: string, status: Invoice['status']) => {
    try {
      const res = await fetch(`/api/projects/${project.id}/invoices/${invoiceId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error updating invoice status:', err);
    }
  };

  // Timesheet approval / reject (Boss / Manager)
  const handleTimesheetStatus = async (
    timesheetId: string,
    status: 'APPROVED' | 'REJECTED'
  ) => {
    try {
      const res = await fetch(
        `/api/projects/${project.id}/timesheets/${timesheetId}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      );
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error updating timesheet status:', err);
    }
  };

  // Calculations for Financials
  const totalInvoiced = project.invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = project.invoices
    .filter((inv) => inv.status === 'PAID')
    .reduce((sum, inv) => sum + inv.amount, 0);
  const totalOutstanding = totalInvoiced - totalPaid;

  const totalLaborHours = project.timesheets
    .filter((t) => t.status === 'APPROVED')
    .reduce((sum, t) => sum + t.hours, 0);
  const totalMaterialExpenses = project.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const estimatedLaborCost = totalLaborHours * 65; // $65/hr fully burdened rate
  const totalIncurredCost = totalMaterialExpenses + estimatedLaborCost;
  const grossProfit = project.contractValue - totalIncurredCost;
  const grossMarginPercent =
    project.contractValue > 0 ? (grossProfit / project.contractValue) * 100 : 0;

  const canManageBilling = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER';

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Return to Projects List"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  {project.name}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {project.phase}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {project.clientCompany} ({project.clientName})
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {project.address}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-right">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Contract Value
              </span>
              <span className="text-base font-extrabold text-slate-900 font-mono">
                ${project.contractValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Superintendent / PM
              </span>
              <span className="text-xs font-bold text-slate-800">
                {project.assignedPmName}
              </span>
            </div>
          </div>
        </div>

        {/* Phase Progress Stepper */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500">Project Phase:</span>
            {(['PRECONSTRUCTION', 'CONSTRUCTION', 'CLOSEOUT'] as const).map((ph, idx) => {
              const isCurrent = project.phase === ph;
              return (
                <button
                  key={ph}
                  type="button"
                  onClick={() => canManageBilling && handlePhaseChange(ph)}
                  disabled={!canManageBilling || updating}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    isCurrent
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  } ${!canManageBilling ? 'cursor-default' : ''}`}
                >
                  <span>
                    {idx + 1}. {ph.charAt(0) + ph.slice(1).toLowerCase()}
                  </span>
                  {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
              );
            })}
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Target Completion: {new Date(project.targetCompletionDate).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* 4 Interactive Workspace Navigation Tabs */}
      <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1">
        {[
          { id: 'schedule' as const, label: '1. Schedule & Milestones', icon: CheckSquare, count: project.milestones.length },
          { id: 'invoicing' as const, label: '2. Invoicing & Billing', icon: DollarSign, count: project.invoices.length },
          { id: 'timesheets' as const, label: '3. Timesheets & Labor', icon: Clock, count: project.timesheets.length },
          { id: 'expenses' as const, label: '4. Material Expenses & Budget', icon: Receipt, count: project.expenses.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive ? 'bg-indigo-700/60 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: SCHEDULE & MILESTONES */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                  <span>Execution Schedule &amp; Target Milestones</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Check off project gates as field deliverables and regulatory approvals are completed.
                </p>
              </div>

              <div className="text-xs text-slate-600">
                Completed:{' '}
                <strong className="text-indigo-700 font-bold">
                  {project.milestones.filter((m) => m.completed).length} of{' '}
                  {project.milestones.length}
                </strong>
              </div>
            </div>

            {/* Checklist */}
            <div className="space-y-2">
              {project.milestones.map((m) => (
                <div
                  key={m.id}
                  onClick={() => handleToggleMilestone(m.id, m.completed)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                    m.completed
                      ? 'bg-emerald-50/40 border-emerald-200 text-slate-700'
                      : 'bg-white border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {m.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                    <span className={`font-semibold ${m.completed ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                      {m.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Target: {new Date(m.targetDate).toLocaleDateString()}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      m.completed ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {m.completed ? 'Completed' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Add milestone form */}
            {canManageBilling && (
              <form onSubmit={handleAddMilestone} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <span className="font-semibold text-slate-700 block">Add New Project Milestone</span>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="text"
                    value={newMilestoneTitle}
                    onChange={(e) => setNewMilestoneTitle(e.target.value)}
                    placeholder="Milestone description (e.g. ESA Rough-In Inspection Sign-off)..."
                    className="flex-1 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                  <input
                    type="date"
                    value={newMilestoneDate}
                    onChange={(e) => setNewMilestoneDate(e.target.value)}
                    className="w-full sm:w-44 px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shrink-0 flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Milestone</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INVOICING & BILLING */}
      {activeTab === 'invoicing' && (
        <div className="space-y-4">
          {/* Invoicing KPI Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Contract
              </span>
              <span className="text-base font-extrabold text-slate-900 font-mono mt-1 block">
                ${project.contractValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Billed
              </span>
              <span className="text-base font-extrabold text-indigo-700 font-mono mt-1 block">
                ${totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Collected (Paid)
              </span>
              <span className="text-base font-extrabold text-emerald-700 font-mono mt-1 block">
                ${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Balance Due
              </span>
              <span className="text-base font-extrabold text-amber-700 font-mono mt-1 block">
                ${totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Invoices List */}
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Progress Invoices &amp; 13% HST Tax Tracking</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Generate milestone billing statements and record received payments.
                </p>
              </div>

              {canManageBilling && (
                <button
                  type="button"
                  onClick={() => setInvoiceModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Invoice</span>
                </button>
              )}
            </div>

            {project.invoices.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-lg text-xs text-slate-400">
                No invoices generated yet for this project.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 pr-4">Invoice #</th>
                      <th className="py-2.5 px-3">Issued Date</th>
                      <th className="py-2.5 px-3">Due Date</th>
                      <th className="py-2.5 px-3 text-right">Net Amount</th>
                      <th className="py-2.5 px-3 text-right">13% HST</th>
                      <th className="py-2.5 px-3 text-right">Total With HST</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      {canManageBilling && <th className="py-2.5 pl-3 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {project.invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="py-3 pr-4 font-bold text-slate-900">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-sans">
                          {new Date(inv.issueDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-sans">
                          {new Date(inv.dueDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700">
                          ${inv.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-500">
                          ${inv.hst.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-indigo-700">
                          ${inv.totalWithHst.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              inv.status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : inv.status === 'SENT'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : inv.status === 'OVERDUE'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        {canManageBilling && (
                          <td className="py-3 pl-3 text-right font-sans">
                            {inv.status === 'DRAFT' && (
                              <button
                                type="button"
                                onClick={() => handleInvoiceStatus(inv.id, 'SENT')}
                                className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                              >
                                Mark Sent
                              </button>
                            )}
                            {inv.status === 'SENT' && (
                              <button
                                type="button"
                                onClick={() => handleInvoiceStatus(inv.id, 'PAID')}
                                className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors"
                              >
                                Mark Paid
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TIMESHEETS & LABOR */}
      {activeTab === 'timesheets' && (
        <div className="space-y-4">
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Field Labor Timesheets &amp; Hours Log</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Employees log project work sessions; managers review and approve for payroll/job costing.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-xs text-slate-600">
                  Approved Labor:{' '}
                  <strong className="text-indigo-700 font-bold">{totalLaborHours} hrs</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setTimesheetModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log Hours</span>
                </button>
              </div>
            </div>

            {project.timesheets.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-lg text-xs text-slate-400">
                No hours logged on this project yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 pr-4">Date</th>
                      <th className="py-2.5 px-3">Technician / Employee</th>
                      <th className="py-2.5 px-3 text-right">Hours</th>
                      <th className="py-2.5 px-3">Description of Work</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      {canManageBilling && <th className="py-2.5 pl-3 text-right">Review Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {project.timesheets.map((ts) => (
                      <tr key={ts.id} className="hover:bg-slate-50">
                        <td className="py-3 pr-4 font-mono text-slate-700">
                          {new Date(ts.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {ts.employeeName}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          {ts.hours} hrs
                        </td>
                        <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                          {ts.description}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              ts.status === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : ts.status === 'REJECTED'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {ts.status}
                          </span>
                        </td>
                        {canManageBilling && (
                          <td className="py-3 pl-3 text-right">
                            {ts.status === 'PENDING' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleTimesheetStatus(ts.id, 'APPROVED')}
                                  className="px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTimesheetStatus(ts.id, 'REJECTED')}
                                  className="px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400">
                                {ts.approvedBy ? `Reviewed by ${ts.approvedBy}` : 'Processed'}
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: MATERIAL EXPENSES & BUDGET */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {/* Budget vs Incurred Costs Card */}
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Job Costing &amp; Profit Margin Tracking</span>
              </h3>
              <span className="text-xs font-mono font-bold text-indigo-700">
                {grossMarginPercent.toFixed(1)}% Realized Margin
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                  Total Contract
                </span>
                <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                  ${project.contractValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                  Material Incurred
                </span>
                <span className="text-sm font-bold text-slate-800 mt-0.5 block">
                  ${totalMaterialExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                  Labor Incurred (@$65)
                </span>
                <span className="text-sm font-bold text-slate-800 mt-0.5 block">
                  ${estimatedLaborCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                  Gross Profit
                </span>
                <span className="text-sm font-extrabold text-emerald-700 mt-0.5 block">
                  ${grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Visual Budget Progress Bar */}
            <div className="space-y-1 pt-1">
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                <div
                  style={{
                    width: `${Math.min(100, (totalIncurredCost / (project.contractValue || 1)) * 100)}%`,
                  }}
                  className={`h-full ${
                    totalIncurredCost > project.contractValue ? 'bg-rose-500' : 'bg-indigo-600'
                  }`}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Incurred Costs: ${totalIncurredCost.toFixed(2)}</span>
                <span>Contract Ceiling: ${project.contractValue.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-indigo-600" />
                  <span>Itemized Material POs &amp; Direct Job Expenses</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Track vendor purchase orders, conduit, wire, fixtures, and petty cash.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setExpenseModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Expense</span>
              </button>
            </div>

            {project.expenses.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-lg text-xs text-slate-400">
                No material expenses or reimbursements recorded for this project yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 pr-4">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Vendor / Recipient</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Receipt / Reference Note</th>
                      <th className="py-2.5 pl-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {project.expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50">
                        <td className="py-3 pr-4 font-mono text-slate-600">
                          {new Date(exp.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              exp.type === 'MATERIAL'
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'bg-purple-50 text-purple-700'
                            }`}
                          >
                            {exp.type}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {exp.vendorOrEmployee}
                        </td>
                        <td className="py-3 px-3 text-slate-600">{exp.category}</td>
                        <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                          {exp.receiptNote}
                        </td>
                        <td className="py-3 pl-3 text-right font-mono font-bold text-slate-900">
                          ${exp.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <InvoiceModal
        projectId={project.id}
        isOpen={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        onSuccess={() => onRefresh()}
      />

      <TimesheetModal
        projectId={project.id}
        projectName={project.name}
        isOpen={timesheetModalOpen}
        onClose={() => setTimesheetModalOpen(false)}
        onSuccess={() => onRefresh()}
      />

      <ExpenseModal
        projectId={project.id}
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onSuccess={() => onRefresh()}
      />
    </div>
  );
}
