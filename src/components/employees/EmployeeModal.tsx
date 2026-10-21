import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal.tsx';
import type { SafeUser, UserRole } from '../../types/index.ts';

interface EmployeeModalProps {
  user: SafeUser | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  allUsers?: SafeUser[];
}

export function EmployeeModal({
  user,
  isOpen,
  onClose,
  onSuccess,
  allUsers = [],
}: EmployeeModalProps) {
  const isEditing = Boolean(user);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('EMPLOYEE');
  const [department, setDepartment] = useState('');
  const [title, setTitle] = useState('');
  const [managerId, setManagerId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPassword('');
      setRole(user.role);
      setDepartment(user.department);
      setTitle(user.title);
      setManagerId(user.managerId || '');
      setError(null);
    } else {
      setName('');
      setEmail('');
      setPassword('DefaultPass123!');
      setRole('EMPLOYEE');
      setDepartment('Engineering');
      setTitle('Software Engineer');
      const firstManager = (allUsers || []).find((u) => u.role === 'MANAGER');
      setManagerId(firstManager ? firstManager.id : '');
      setError(null);
    }
  }, [user, isOpen, allUsers]);

  if (!isOpen) return null;

  const potentialManagers = (allUsers || []).filter(
    (u) => (u.role === 'BOSS' || u.role === 'MANAGER') && (!user || u.id !== user.id)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = isEditing ? `/api/users/${user!.id}` : '/api/users';
      const method = isEditing ? 'PATCH' : 'POST';

      const payload: Record<string, unknown> = {
        name: name.trim(),
        department: department.trim(),
        title: title.trim(),
        managerId: managerId || null,
        role,
      };

      if (!isEditing) {
        payload.email = email.trim();
        payload.password = password;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save employee profile.');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Modify Personnel Profile' : 'Provision Enterprise Account'}
      description={
        isEditing
          ? 'Update employee role, department, or supervisory assignment'
          : 'Create a new employee profile with role permissions'
      }
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="emp-name"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Full Name
            </label>
            <input
              id="emp-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jordan Miller"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="emp-email"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Email Address
            </label>
            <input
              id="emp-email"
              type="email"
              required
              disabled={isEditing}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jordan.miller@workpulse.io"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {!isEditing && (
          <div>
            <label
              htmlFor="emp-password"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Temporary Password (at least 8 chars, 1 uppercase, 1 number)
            </label>
            <input
              id="emp-password"
              type="text"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="emp-role"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              RBAC Role
            </label>
            <select
              id="emp-role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="EMPLOYEE">Employee (Staff)</option>
              <option value="MANAGER">Manager (Supervisory)</option>
              <option value="BOSS">Boss (Executive)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="emp-dept"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Department
            </label>
            <input
              id="emp-dept"
              type="text"
              required
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Engineering"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="emp-title"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Job Title
            </label>
            <input
              id="emp-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. QA Automation Specialist"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="emp-manager"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Reporting Manager
            </label>
            <select
              id="emp-manager"
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">No Direct Manager (Top Level)</option>
              {potentialManagers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role} · {m.department})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Provision Account'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
