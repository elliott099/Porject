import React from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { RoleBadge } from '../ui/Badge.tsx';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  Shield,
  Settings,
  LogOut,
  Layers,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  inquiriesBadgeCount?: number;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  mobileOpen = false,
  onCloseMobile,
  inquiriesBadgeCount = 0,
}: SidebarProps) {
  const { user, logout } = useAuth();

  if (!user) return null;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['BOSS', 'MANAGER', 'EMPLOYEE'],
    },
    {
      id: 'leads',
      label: 'Leads & CRM',
      icon: Users,
      roles: ['BOSS', 'MANAGER'],
    },
    {
      id: 'estimates',
      label: 'Estimates & Proposals',
      icon: Layers,
      roles: ['BOSS', 'MANAGER'],
      badge: inquiriesBadgeCount > 0 ? inquiriesBadgeCount : undefined,
    },
    {
      id: 'projects',
      label: 'Projects & Invoicing',
      icon: CheckSquare,
      roles: ['BOSS', 'MANAGER', 'EMPLOYEE'],
    },
    {
      id: 'tasks',
      label: 'Tasks & Delivery',
      icon: CheckSquare,
      roles: ['BOSS', 'MANAGER', 'EMPLOYEE'],
    },
    {
      id: 'employees',
      label: 'Team & Directory',
      icon: Users,
      roles: ['BOSS', 'MANAGER'],
    },
    {
      id: 'audit-logs',
      label: 'Security & Audit',
      icon: Shield,
      roles: ['BOSS'],
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      roles: ['BOSS', 'MANAGER', 'EMPLOYEE'],
    },
  ];

  const visibleItems = navItems.filter((item) => item.roles.includes(user.role));

  const content = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-64 select-none">
      {/* Brand Header */}
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 leading-none">
              WorkPulse
            </h1>
            <span className="text-[10px] text-slate-500 font-medium tracking-wider uppercase mt-0.5 block">
              Enterprise System
            </span>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Workspace
        </div>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectTab(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-indigo-600' : 'text-slate-400'
                }`}
              />
              <span className="truncate flex-1">{item.label}</span>
              {Boolean(item.badge) && (
                <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-rose-500 text-white rounded-full animate-pulse shadow-2xs">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
        <div className="p-2.5 rounded-lg border border-slate-200/70 bg-white">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-slate-900 truncate pr-2">
              {user.name}
            </div>
            <RoleBadge role={user.role} />
          </div>
          <div className="text-[11px] text-slate-500 truncate mb-1">
            {user.email}
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            {user.department}
          </div>

          <button
            type="button"
            onClick={() => logout()}
            className="mt-3 w-full flex items-center justify-center gap-2 py-1.5 px-2 text-xs text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-md transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block shrink-0 h-screen sticky top-0">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10">{content}</div>
        </div>
      )}
    </>
  );
}
