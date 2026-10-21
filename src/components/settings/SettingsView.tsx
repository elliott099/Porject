import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { RoleBadge } from '../ui/Badge.tsx';
import type { CompanySettings } from '../../types/index.ts';
import { Shield, Key, Building } from 'lucide-react';

interface SettingsViewProps {
  onShowToast: (message: string, type?: 'success' | 'error') => void;
}

export function SettingsView({ onShowToast }: SettingsViewProps) {
  const { user, refreshUser } = useAuth();
  const isBoss = user?.role === 'BOSS';

  // Profile Form State
  const [profileName, setProfileName] = useState(user?.name || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Governance Form State (Boss only)
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileName(user.name);
    }
  }, [user]);

  useEffect(() => {
    if (isBoss) {
      fetch('/api/settings')
        .then((res) => res.json())
        .then((data) => {
          if (data.settings) setSettings(data.settings);
        })
        .catch(console.error);
    }
  }, [isBoss]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      await refreshUser();
      onShowToast('Profile name updated successfully', 'success');
    } catch (err: unknown) {
      onShowToast(err instanceof Error ? err.message : 'Error updating profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      onShowToast('New passwords do not match.', 'error');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onShowToast('Password updated successfully.', 'success');
    } catch (err: unknown) {
      onShowToast(err instanceof Error ? err.message : 'Error updating password', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSavingSettings(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update company settings');

      setSettings(data.settings);
      onShowToast('Company governance settings updated.', 'success');
    } catch (err: unknown) {
      onShowToast(err instanceof Error ? err.message : 'Error saving settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 1. Profile Information */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Personal Profile</h3>
            <p className="text-xs text-slate-500">Your enterprise directory identity</p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="user-profile-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Display Name
              </label>
              <input
                id="user-profile-name"
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="user-profile-email" className="block text-xs font-semibold text-slate-700 mb-1">
                Corporate Email
              </label>
              <input
                id="user-profile-email"
                type="email"
                disabled
                value={user.email}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <span className="block text-xs font-semibold text-slate-500 mb-1">Role Permission</span>
              <RoleBadge role={user.role} />
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-500 mb-1">Department</span>
              <span className="text-xs text-slate-800 font-medium">{user.department}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-500 mb-1">Job Title</span>
              <span className="text-xs text-slate-800 font-medium">{user.title}</span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {savingProfile ? 'Saving...' : 'Update Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Password & Security */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Security &amp; Credentials</h3>
            <p className="text-xs text-slate-500">Update your account password</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="current-password-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Current Password
              </label>
              <input
                id="current-password-input"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="new-password-input" className="block text-xs font-semibold text-slate-700 mb-1">
                New Password (Min 8 chars, 1 upper, 1 num)
              </label>
              <input
                id="new-password-input"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="confirm-new-password-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm New Password
              </label>
              <input
                id="confirm-new-password-input"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingPassword}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
            >
              {savingPassword ? 'Updating...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>

      {/* 3. Company Governance (Boss only) */}
      {isBoss && settings && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
          <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Company Governance &amp; Policies (Executive Only)
              </h3>
              <p className="text-xs text-slate-500">Configure global operational parameters</p>
            </div>
          </div>

          <form onSubmit={handleUpdateSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="org-name-input" className="block text-xs font-semibold text-slate-700 mb-1">
                  Organization Entity Name
                </label>
                <input
                  id="org-name-input"
                  type="text"
                  required
                  value={settings.companyName}
                  onChange={(e) =>
                    setSettings({ ...settings, companyName: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="default-deadline-days-input" className="block text-xs font-semibold text-slate-700 mb-1">
                  Default Task SLA / Deadline (Days)
                </label>
                <input
                  id="default-deadline-days-input"
                  type="number"
                  min={1}
                  max={60}
                  required
                  value={settings.defaultTaskDeadlineDays}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultTaskDeadlineDays: parseInt(e.target.value, 10) || 7,
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enforceManagerReview}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      enforceManagerReview: e.target.checked,
                    })
                  }
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="font-medium">
                  Enforce manager approval review before task closure is finalized
                </span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allowEmployeeSelfAssignment}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      allowEmployeeSelfAssignment: e.target.checked,
                    })
                  }
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="font-medium">
                  Allow employees to self-assign unallocated backlog tasks
                </span>
              </label>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {savingSettings ? 'Saving...' : 'Save Governance Policies'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
