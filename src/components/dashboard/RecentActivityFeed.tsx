import { formatDateTime } from '../../lib/utils.ts';
import type { ActivityLog } from '../../types/index.ts';
import { RoleBadge } from '../ui/Badge.tsx';
import { ShieldCheck, UserCheck, Briefcase, FileText } from 'lucide-react';

export function RecentActivityFeed({ logs }: { logs: ActivityLog[] }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400">
        No recent activity records found.
      </div>
    );
  }

  const getIcon = (action: string) => {
    if (action.startsWith('AUTH')) return <ShieldCheck className="w-4 h-4 text-indigo-600" />;
    if (action.startsWith('USER')) return <UserCheck className="w-4 h-4 text-emerald-600" />;
    if (action.startsWith('TASK')) return <Briefcase className="w-4 h-4 text-blue-600" />;
    return <FileText className="w-4 h-4 text-slate-500" />;
  };

  return (
    <div className="divide-y divide-slate-100">
      {logs.map((log) => (
        <div key={log.id} className="py-3 flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200/60 shrink-0 mt-0.5">
            {getIcon(log.action)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-900 truncate">
                {log.actorName}
              </span>
              <RoleBadge role={log.actorRole} />
              <span className="text-[11px] text-slate-400 font-mono tabular-nums ml-auto shrink-0">
                {formatDateTime(log.timestamp)}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 line-clamp-2">{log.details}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
