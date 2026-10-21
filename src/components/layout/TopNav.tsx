import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Menu,
  Plus,
  ChevronDown,
  UserPlus,
  Calculator,
  Briefcase,
  CheckSquare,
} from 'lucide-react';

interface TopNavProps {
  currentTab: string;
  onOpenMobileMenu: () => void;
  onQuickAction?: (action: 'lead' | 'estimate' | 'project' | 'task') => void;
}

export function TopNav({
  currentTab,
  onOpenMobileMenu,
  onQuickAction,
}: TopNavProps) {
  const { user } = useAuth();
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setQuickMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTitle = () => {
    if (currentTab === 'dashboard') {
      if (user?.role === 'BOSS') return 'Executive Command Center';
      if (user?.role === 'MANAGER') return 'Team Operations Dashboard';
      return 'My Personal Workspace';
    }
    const titleMap: Record<string, string> = {
      leads: 'Sales & CRM Lead Pipeline',
      estimates: 'Estimating & Proposal Builder',
      projects: 'Project Operations & Delivery',
      tasks: 'Task Operations & Execution',
      employees: 'Team Directory & Hierarchy',
      'audit-logs': 'Immutable Security Audit Logs',
      settings: 'System & Profile Governance',
    };
    return titleMap[currentTab] || 'Dashboard';
  };

  const canQuickCreate = user?.role === 'BOSS' || user?.role === 'MANAGER';

  const handleAction = (action: 'lead' | 'estimate' | 'project' | 'task') => {
    setQuickMenuOpen(false);
    if (onQuickAction) {
      onQuickAction(action);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white/95 backdrop-blur-xs border-b border-slate-200">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open mobile navigation"
          className="lg:hidden p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            {getTitle()}
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>WorkPulse</span>
            <span aria-hidden="true">/</span>
            <span className="capitalize">{currentTab.replace('-', ' ')}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Global "+ New" Quick Action Dropdown Menu */}
        {canQuickCreate && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setQuickMenuOpen(!quickMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New</span>
              <ChevronDown className="w-3.5 h-3.5 text-indigo-200" />
            </button>

            {quickMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-50 space-y-0.5 text-xs">
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Quick Actions
                </div>

                <button
                  type="button"
                  onClick={() => handleAction('lead')}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg text-left transition-colors font-medium"
                >
                  <UserPlus className="w-4 h-4 text-purple-600" />
                  <span>Lead</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAction('estimate')}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg text-left transition-colors font-medium"
                >
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  <span>Estimate / Proposal</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAction('project')}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg text-left transition-colors font-medium"
                >
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  <span>Project</span>
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  type="button"
                  onClick={() => handleAction('task')}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg text-left transition-colors font-medium"
                >
                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                  <span>Task Deliverable</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* User Mini Avatar Badge */}
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-medium flex items-center justify-center text-xs">
              {user.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-slate-900 leading-tight">
                {user.name}
              </div>
              <div className="text-[10px] text-slate-500 capitalize">
                {user.role.toLowerCase()}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
