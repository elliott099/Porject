import { formatDate } from '../../lib/utils.ts';
import { isTaskOverdue } from '../../shared/permissions.ts';
import { StatusBadge, PriorityBadge } from '../ui/Badge.tsx';
import type { TaskWithDetails, UserRole } from '../../types/index.ts';
import { AlertCircle, Edit2, Trash2, ArrowRightCircle } from 'lucide-react';

interface TaskTableProps {
  tasks: TaskWithDetails[];
  role: UserRole;
  onEditTask: (task: TaskWithDetails) => void;
  onDeleteTask: (task: TaskWithDetails) => void;
  onProgressTask: (task: TaskWithDetails) => void;
}

export function TaskTable({
  tasks,
  role,
  onEditTask,
  onDeleteTask,
  onProgressTask,
}: TaskTableProps) {
  if (tasks.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
        <p className="text-sm font-medium text-slate-700">No tasks match your criteria.</p>
        <p className="text-xs text-slate-500 mt-1">
          Adjust your active filter or search term to view other records.
        </p>
      </div>
    );
  }

  const isEmployee = role === 'EMPLOYEE';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Task &amp; Description</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Status</th>
              {!isEmployee && <th className="py-3 px-4">Assignee</th>}
              <th className="py-3 px-4">Deadline</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {tasks.map((task) => {
              const overdue = isTaskOverdue(task);
              return (
                <tr
                  key={task.id}
                  className="hover:bg-slate-50/60 transition-colors group"
                >
                  {/* Title & Description */}
                  <td className="py-3 px-4 max-w-xs">
                    <div className="font-semibold text-slate-900 line-clamp-1">
                      {task.title}
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {task.description}
                    </div>
                    {task.progressNotes && task.progressNotes.length > 0 && (
                      <div className="text-[10px] text-indigo-600 font-medium mt-1">
                        {task.progressNotes.length} update note
                        {task.progressNotes.length > 1 ? 's' : ''} logged
                      </div>
                    )}
                  </td>

                  {/* Priority */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <PriorityBadge priority={task.priority} />
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <StatusBadge status={task.status} />
                  </td>

                  {/* Assignee (visible to Boss & Manager) */}
                  {!isEmployee && (
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900">
                        {task.assignee?.name || 'Unassigned'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {task.assignee?.department}
                      </div>
                    </td>
                  )}

                  {/* Deadline & Overdue Math */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-mono tabular-nums">
                      <span
                        className={
                          overdue ? 'text-rose-600 font-semibold' : 'text-slate-600'
                        }
                      >
                        {formatDate(task.deadline)}
                      </span>
                      {overdue && (
                        <span
                          title="This task is overdue"
                          className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-700 bg-rose-50 px-1 py-0.2 rounded border border-rose-200"
                        >
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          OVERDUE
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {isEmployee ? (
                      <button
                        type="button"
                        onClick={() => onProgressTask(task)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
                      >
                        <ArrowRightCircle className="w-3.5 h-3.5" />
                        <span>Update Status &amp; Notes</span>
                      </button>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEditTask(task)}
                          aria-label={`Edit task ${task.title}`}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTask(task)}
                          aria-label={`Delete task ${task.title}`}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
