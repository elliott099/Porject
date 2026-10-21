import React, { useState } from 'react';
import { Modal } from '../ui/Modal.tsx';
import { Clock, Calendar, FileText, CheckCircle2 } from 'lucide-react';

interface TimesheetModalProps {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TimesheetModal({
  projectId,
  projectName,
  isOpen,
  onClose,
  onSuccess,
}: TimesheetModalProps) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [hours, setHours] = useState<number>(8);
  const [description, setDescription] = useState(
    'Installed 200A subpanel conduit runs and pulled branch homerun circuits.'
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hours <= 0 || hours > 24 || !description.trim()) {
      setError('Please provide valid hours (1-24) and work description.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/timesheets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date(date).toISOString(),
          hours: Number(hours),
          description: description.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit timesheet');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error logging hours');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log Project Labor Hours"
      description={`Record hours on ${projectName} for superintendent review.`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Work Date</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Hours Worked</label>
            <div className="relative">
              <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="number"
                min="0.5"
                max="24"
                step="0.5"
                value={hours}
                onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-semibold"
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Activity &amp; Task Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Specify activities performed on site (e.g. rough-in, light fixtures, test circuits)..."
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg resize-none"
            required
          />
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
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
            <span>{submitting ? 'Submitting...' : 'Submit Logged Hours'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
