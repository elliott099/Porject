import { formatDate } from '../../lib/utils.ts';
import { RoleBadge } from '../ui/Badge.tsx';
import type { SafeUser, UserRole } from '../../types/index.ts';
import { Edit2, UserX, UserCheck } from 'lucide-react';

interface EmployeeTableProps {
  users: SafeUser[];
  role: UserRole;
  onEdit: (user: SafeUser) => void;
  onToggleActive: (user: SafeUser) => void;
}

export function EmployeeTable({
  users,
  role,
  onEdit,
  onToggleActive,
}: EmployeeTableProps) {
  const isBoss = role === 'BOSS';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Employee</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Department &amp; Title</th>
              <th className="py-3 px-4">Reporting Manager</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Member Since</th>
              {isBoss && <th className="py-3 px-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {users.map((u) => {
              const manager = users.find((m) => m.id === u.managerId);
              return (
                <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                  {/* Name & Email */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-semibold flex items-center justify-center text-[11px] shrink-0 border border-slate-200">
                        {u.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-400">{u.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <RoleBadge role={u.role} />
                  </td>

                  {/* Department & Title */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-medium text-slate-900">{u.title}</div>
                    <div className="text-[11px] text-slate-400">{u.department}</div>
                  </td>

                  {/* Manager */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {manager ? (
                      <span className="font-medium text-slate-800">{manager.name}</span>
                    ) : u.role === 'BOSS' ? (
                      <span className="text-slate-400 italic">Executive Board</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${
                        u.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {u.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </td>

                  {/* Created Date */}
                  <td className="py-3 px-4 whitespace-nowrap font-mono tabular-nums text-slate-500">
                    {formatDate(u.createdAt)}
                  </td>

                  {/* Boss Actions */}
                  {isBoss && (
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEdit(u)}
                          aria-label={`Edit ${u.name}`}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {u.role !== 'BOSS' && (
                          <button
                            type="button"
                            onClick={() => onToggleActive(u)}
                            aria-label={u.isActive ? `Deactivate ${u.name}` : `Reactivate ${u.name}`}
                            className={`p-1.5 rounded-md transition-colors ${
                              u.isActive
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {u.isActive ? (
                              <UserX className="w-4 h-4" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
