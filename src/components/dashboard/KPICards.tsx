import { Users, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import type { DashboardMetrics, UserRole } from '../../types/index.ts';

interface KPICardsProps {
  metrics: DashboardMetrics;
  role: UserRole;
}

export function KPICards({ metrics, role }: KPICardsProps) {
  const isEmployee = role === 'EMPLOYEE';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Metric 1 */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">
            {isEmployee ? 'My Assigned Tasks' : 'Total Department Staff'}
          </span>
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {isEmployee ? metrics.tasksTotal : metrics.totalStaff}
          </span>
          <span className="text-xs text-slate-500">
            {isEmployee ? 'items in backlog' : `${metrics.activeManagers} Managers`}
          </span>
        </div>
      </div>

      {/* Metric 2: In Progress */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">
            Active In Progress
          </span>
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {metrics.tasksInProgress}
          </span>
          <span className="text-xs text-slate-500">
            {metrics.tasksPending} pending kick-off
          </span>
        </div>
      </div>

      {/* Metric 3: Overdue */}
      <div
        className={`p-4 bg-white rounded-xl border shadow-2xs ${
          metrics.tasksOverdue > 0 ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-medium ${
              metrics.tasksOverdue > 0 ? 'text-rose-700' : 'text-slate-500'
            }`}
          >
            Overdue Tasks
          </span>
          <div
            className={`p-2 rounded-lg ${
              metrics.tasksOverdue > 0
                ? 'bg-rose-100 text-rose-700'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className={`text-2xl font-bold font-mono tabular-nums ${
              metrics.tasksOverdue > 0 ? 'text-rose-700' : 'text-slate-900'
            }`}
          >
            {metrics.tasksOverdue}
          </span>
          <span className="text-xs text-slate-500">
            {metrics.tasksOverdue > 0 ? 'Requires immediate action' : 'All deadlines on track'}
          </span>
        </div>
      </div>

      {/* Metric 4: Completion Rate */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">
            Completion Rate
          </span>
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {metrics.completionRate}%
          </span>
          <span className="text-xs text-slate-500">
            {metrics.tasksCompleted} / {metrics.tasksTotal} delivered
          </span>
        </div>
        <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${metrics.completionRate}%` }}
          />
        </div>
      </div>
    </div>
  );
}
