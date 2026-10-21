import { useAuth } from '../../context/AuthContext.tsx';
import type { UserRole } from '../../types/index.ts';
import { ShieldCheck, UserCheck, Briefcase } from 'lucide-react';

interface Props {
  compact?: boolean;
}

export function DemoRoleSwitcher({ compact = false }: Props) {
  const { user, switchDemoRole, loading } = useAuth();

  const roles: { role: UserRole; title: string; subtitle: string; icon: typeof ShieldCheck }[] = [
    {
      role: 'BOSS',
      title: 'Boss / Admin',
      subtitle: 'Arthur (CEO)',
      icon: ShieldCheck,
    },
    {
      role: 'MANAGER',
      title: 'Manager',
      subtitle: 'Marcus (VP Eng)',
      icon: Briefcase,
    },
    {
      role: 'EMPLOYEE',
      title: 'Employee',
      subtitle: 'Alex (Staff)',
      icon: UserCheck,
    },
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
        <span className="text-[11px] font-medium text-slate-500 px-2 uppercase tracking-wider">
          Demo:
        </span>
        {roles.map((r) => {
          const isActive = user?.role === r.role;
          return (
            <button
              key={r.role}
              type="button"
              disabled={loading}
              onClick={() => switchDemoRole(r.role)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              {r.title}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {roles.map((r) => {
        const Icon = r.icon;
        const isActive = user?.role === r.role;
        return (
          <button
            key={r.role}
            type="button"
            disabled={loading}
            onClick={() => switchDemoRole(r.role)}
            className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
              isActive
                ? 'bg-indigo-50/50 border-indigo-300 ring-1 ring-indigo-300'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div
              className={`p-2 rounded-lg shrink-0 ${
                isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900">{r.title}</div>
              <div className="text-[11px] text-slate-500">{r.subtitle}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
