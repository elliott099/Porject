import { useState } from 'react';
import type { SafeUser } from '../../types/index.ts';
import { RoleBadge } from '../ui/Badge.tsx';
import { ChevronDown, ChevronRight, User, Users } from 'lucide-react';

export function HierarchyTree({ users }: { users: SafeUser[] }) {
  const [collapsedManagers, setCollapsedManagers] = useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string) => {
    setCollapsedManagers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Find boss
  const boss = users.find((u) => u.role === 'BOSS');
  // Find managers reporting to boss
  const managers = users.filter((u) => u.role === 'MANAGER');

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
      <div className="mb-6 pb-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Organizational Supervisory Hierarchy
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict reporting tree governing manager team isolation and task assignment boundaries
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Users className="w-4 h-4 text-slate-400" />
          <span>{users.length} Active Personnel</span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Boss Node */}
        {boss && (
          <div className="p-4 rounded-xl border-2 border-purple-200 bg-purple-50/20 max-w-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                {boss.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-900">{boss.name}</span>
                  <RoleBadge role={boss.role} />
                </div>
                <div className="text-xs text-slate-500">{boss.title} · {boss.department}</div>
              </div>
            </div>
          </div>
        )}

        {/* Tree Branch Line */}
        <div className="pl-6 border-l-2 border-slate-200 space-y-6 ml-4">
          {managers.map((mgr) => {
            const reports = users.filter((u) => u.managerId === mgr.id);
            const isCollapsed = collapsedManagers[mgr.id];

            return (
              <div key={mgr.id} className="relative space-y-3">
                {/* Horizontal branch indicator */}
                <div className="absolute -left-6 top-5 w-6 h-0.5 bg-slate-200" />

                {/* Manager Card */}
                <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/20 max-w-lg transition-all hover:border-blue-300">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center text-xs shrink-0 shadow-xs">
                        {mgr.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-900 truncate">
                            {mgr.name}
                          </span>
                          <RoleBadge role={mgr.role} />
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {mgr.title} · {mgr.department}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleCollapse(mgr.id)}
                      className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-blue-700 bg-blue-100/70 hover:bg-blue-100 rounded-md transition-colors shrink-0"
                    >
                      <span>{reports.length} Reports</span>
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Direct Reports */}
                {!isCollapsed && reports.length > 0 && (
                  <div className="pl-6 border-l-2 border-indigo-100 ml-4 space-y-2">
                    {reports.map((emp) => (
                      <div
                        key={emp.id}
                        className="relative flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 bg-white max-w-md shadow-2xs hover:bg-slate-50/70 transition-colors"
                      >
                        <div className="absolute -left-6 top-4 w-6 h-0.5 bg-indigo-100" />
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-medium flex items-center justify-center text-[10px] shrink-0 border border-slate-200">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-xs text-slate-900 truncate">
                              {emp.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {emp.role}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {emp.title}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
