import React, { useState } from 'react';
import { Modal } from '../ui/Modal.tsx';
import type { SafeUser, ProjectPhase } from '../../types/index.ts';
import { Building2, User, MapPin, DollarSign, Calendar, CheckCircle2 } from 'lucide-react';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableUsers: SafeUser[];
}

export function ProjectModal({
  isOpen,
  onClose,
  onSuccess,
  availableUsers,
}: ProjectModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [contractValue, setContractValue] = useState<number>(18000);
  const [phase, setPhase] = useState<ProjectPhase>('PRECONSTRUCTION');
  const [assignedPmId, setAssignedPmId] = useState(
    availableUsers.find((u) => u.role === 'MANAGER')?.id || availableUsers[0]?.id || ''
  );
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [targetCompletionDate, setTargetCompletionDate] = useState(
    new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10)
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim() || !clientCompany.trim()) {
      setError('Please fill in all mandatory project specifications.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim(),
          clientName: clientName.trim() || 'Project Coordinator',
          clientCompany: clientCompany.trim(),
          clientEmail: clientEmail.trim() || 'contracts@client.com',
          clientPhone: clientPhone.trim() || '(416) 555-0100',
          contractValue: Number(contractValue),
          phase,
          assignedPmId,
          startDate: new Date(startDate).toISOString(),
          targetCompletionDate: new Date(targetCompletionDate).toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create project');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating project');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Provision New Commercial Project"
      description="Initialize project workspace, milestones schedule, assigned PM, and contract accounting."
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">
              Project Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aozat Corporate HQ Distribution Retrofit"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">
              Site Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="100 King St W, Suite 5600, Toronto, ON"
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Client Company <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={clientCompany}
              onChange={(e) => setClientCompany(e.target.value)}
              placeholder="e.g. Aozat Inc."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Client Contact Name</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Hitesh Hirpara"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Contract Value ($)</label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="number"
                min="0"
                value={contractValue}
                onChange={(e) => setContractValue(parseFloat(e.target.value) || 0)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-semibold"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Assigned Project Manager</label>
            <select
              value={assignedPmId}
              onChange={(e) => setAssignedPmId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
            >
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Project Phase</label>
            <select
              value={phase}
              onChange={(e) => setPhase(e.target.value as ProjectPhase)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
            >
              <option value="PRECONSTRUCTION">Preconstruction</option>
              <option value="CONSTRUCTION">Construction</option>
              <option value="CLOSEOUT">Closeout &amp; Commissioning</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Target Completion Date</label>
            <input
              type="date"
              value={targetCompletionDate}
              onChange={(e) => setTargetCompletionDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting ? 'Creating...' : 'Provision Project'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
