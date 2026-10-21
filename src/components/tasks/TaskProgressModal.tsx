import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal.tsx';
import { PriorityBadge, StatusBadge } from '../ui/Badge.tsx';
import { formatDate, formatDateTime } from '../../lib/utils.ts';
import { isTaskOverdue } from '../../shared/permissions.ts';
import type { TaskWithDetails, TaskStatus } from '../../types/index.ts';
import { AlertTriangle, Clock } from 'lucide-react';

interface TaskProgressModalProps {
  task: TaskWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TaskProgressModal({
  task,
  isOpen,
  onClose,
  onSuccess,
}: TaskProgressModalProps) {
  const [status, setStatus] = useState<TaskStatus>('IN_PROGRESS');
  const [progressNote, setProgressNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setStatus(task.status);
      setProgressNote('');
      setError(null);
    }
  }, [task]);

  if (!task) return null;

  const overdue = isTaskOverdue(task);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tasks/${task.id}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          progressNote: progressNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit task progress');
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
      title="Task Execution &amp; Progress"
      description="Update work status and append timestamped execution notes"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Task Overview Card */}
        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold text-slate-900">{task.title}</h4>
            <PriorityBadge priority={task.priority} />
          </div>
          <p className="text-xs text-slate-600">{task.description}</p>
          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
            <span>Deadline: {formatDate(task.deadline)}</span>
            {overdue && (
              <span className="flex items-center gap-1 text-rose-600 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                Overdue!
              </span>
            )}
          </div>
        </div>

        {/* Status Transition Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Transition Status
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['PENDING', 'IN_PROGRESS', 'COMPLETED'] as TaskStatus[]).map((s) => {
              const isSelected = status === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all ${
                    isSelected
                      ? s === 'COMPLETED'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-800 font-semibold ring-1 ring-emerald-400'
                        : 'bg-indigo-50 border-indigo-400 text-indigo-800 font-semibold ring-1 ring-indigo-400'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {s.replace('_', ' ')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Append Progress / Deliverable Note */}
        <div>
          <label
            htmlFor="progress-note-input"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            Append Deliverable / Progress Note
          </label>
          <textarea
            id="progress-note-input"
            rows={3}
            value={progressNote}
            onChange={(e) => setProgressNote(e.target.value)}
            placeholder="e.g. Completed unit testing suite and edge middleware authentication flow. Code ready for review."
            className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Past Progress History Timeline */}
        {task.progressNotes && task.progressNotes.length > 0 && (
          <div className="pt-2 border-t border-slate-200">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Activity &amp; Progress History
            </span>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {task.progressNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70 text-xs"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="font-medium text-slate-700">{note.authorName}</span>
                    <span className="font-mono tabular-nums">
                      {formatDateTime(note.createdAt)}
                    </span>
                  </div>
                  <p className="text-slate-600">{note.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit Buttons */}
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
            {loading ? 'Submitting...' : 'Save & Update Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
