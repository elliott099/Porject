import React from 'react';
import type { TaskPriority, TaskStatus, UserRole } from '../../types/index.ts';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'neutral' | 'success' | 'warning' | 'danger' | 'indigo';
  className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variantStyles = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    neutral: 'bg-slate-50 text-slate-600 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  switch (status) {
    case 'COMPLETED':
      return <Badge variant="success">Completed</Badge>;
    case 'IN_PROGRESS':
      return <Badge variant="indigo">In Progress</Badge>;
    case 'PENDING':
    default:
      return <Badge variant="warning">Pending</Badge>;
  }
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  switch (priority) {
    case 'CRITICAL':
      return <Badge variant="danger">Critical</Badge>;
    case 'HIGH':
      return <Badge variant="warning">High</Badge>;
    case 'MEDIUM':
      return <Badge variant="indigo">Medium</Badge>;
    case 'LOW':
    default:
      return <Badge variant="neutral">Low</Badge>;
  }
}

export function RoleBadge({ role }: { role: UserRole }) {
  switch (role) {
    case 'BOSS':
      return (
        <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded bg-purple-50 text-purple-700 border border-purple-200">
          Executive
        </span>
      );
    case 'MANAGER':
      return (
        <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded bg-blue-50 text-blue-700 border border-blue-200">
          Manager
        </span>
      );
    case 'EMPLOYEE':
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-700 border border-slate-200">
          Staff
        </span>
      );
  }
}
