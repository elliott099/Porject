import { useState } from 'react';
import { formatDateTime } from '../../lib/utils.ts';
import { RoleBadge } from '../ui/Badge.tsx';
import type { ActivityLog } from '../../types/index.ts';
import { ShieldCheck, Search, X } from 'lucide-react';

export function AuditLogTable({ logs }: { logs: ActivityLog[] }) {
  const [filterAction, setFilterAction] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = logs.filter((log) => {
    if (filterAction !== 'ALL' && !log.action.startsWith(filterAction)) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        log.actorName.toLowerCase().includes(q) ||
        log.actorEmail.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audit records by actor, action, or details..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-1 bg-slate-100 rounded-lg border border-slate-200">
          {[
            { id: 'ALL', label: 'All Logs' },
            { id: 'AUTH', label: 'Auth & Sessions' },
            { id: 'TASK', label: 'Task Mutations' },
            { id: 'USER', label: 'User Governance' },
            { id: 'SETTINGS', label: 'System Settings' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterAction(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
                filterAction === tab.id
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action Type</th>
                <th className="py-3 px-4">Event Details</th>
                <th className="py-3 px-4">Target Type</th>
                <th className="py-3 px-4">Client IP</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    No activity logs found matching the filter.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Actor */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{log.actorName}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <RoleBadge role={log.actorRole} />
                        <span className="text-[10px] text-slate-400">{log.actorEmail}</span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        <ShieldCheck className="w-3 h-3 text-indigo-600" />
                        {log.action}
                      </span>
                    </td>

                    {/* Details */}
                    <td className="py-3 px-4 max-w-sm">
                      <div className="text-slate-800 text-xs line-clamp-2">
                        {log.details}
                      </div>
                    </td>

                    {/* Target */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60">
                        {log.targetType}
                      </span>
                    </td>

                    {/* IP */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-400">
                      {log.ipAddress || '127.0.0.1'}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono tabular-nums text-slate-500">
                      {formatDateTime(log.timestamp)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
