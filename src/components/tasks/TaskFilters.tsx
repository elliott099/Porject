import { Search, X } from 'lucide-react';
import type { TaskPriority } from '../../types/index.ts';

export type FilterStatus = 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';

interface TaskFiltersProps {
  statusFilter: FilterStatus;
  onStatusChange: (status: FilterStatus) => void;
  priorityFilter: string;
  onPriorityChange: (priority: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  counts: {
    all: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
}

export function TaskFilters({
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
  searchQuery,
  onSearchChange,
  counts,
}: TaskFiltersProps) {
  const tabs: { id: FilterStatus; label: string; count: number }[] = [
    { id: 'ALL', label: 'All Tasks', count: counts.all },
    { id: 'PENDING', label: 'Pending', count: counts.pending },
    { id: 'IN_PROGRESS', label: 'In Progress', count: counts.inProgress },
    { id: 'COMPLETED', label: 'Completed', count: counts.completed },
    { id: 'OVERDUE', label: 'Overdue', count: counts.overdue },
  ];

  return (
    <div className="space-y-3">
      {/* Segmented Status Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
        {tabs.map((tab) => {
          const isActive = statusFilter === tab.id;
          const isOverdueTab = tab.id === 'OVERDUE';
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onStatusChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              } ${isOverdueTab && tab.count > 0 ? 'text-rose-700' : ''}`}
            >
              <span>{tab.label}</span>
              <span
                className={`font-mono tabular-nums text-[11px] px-1.5 py-0.2 rounded-full ${
                  isActive
                    ? isOverdueTab && tab.count > 0
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-100 text-slate-700'
                    : isOverdueTab && tab.count > 0
                    ? 'bg-rose-100 text-rose-700'
                    : 'text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search and Priority Row */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tasks by title, description, or assignee..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="w-full sm:w-48 shrink-0">
          <select
            value={priorityFilter}
            onChange={(e) => onPriorityChange(e.target.value)}
            aria-label="Filter by priority"
            className="w-full py-2 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical Priority</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>
        </div>
      </div>
    </div>
  );
}
