import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal.tsx';
import type {
  TaskWithDetails,
  TaskPriority,
  SafeUser,
} from '../../types/index.ts';

interface TaskFormModalProps {
  task: TaskWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableUsers: SafeUser[];
}

export function TaskFormModal({
  task,
  isOpen,
  onClose,
  onSuccess,
  availableUsers,
}: TaskFormModalProps) {
  const isEditing = Boolean(task);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [deadline, setDeadline] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setPriority(task.priority);
      // Format deadline for date input
      const datePart = task.deadline.split('T')[0];
      setDeadline(datePart);
      setAssigneeId(task.assigneeId);
      setError(null);
    } else {
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      // Default deadline: 7 days in future
      const future = new Date();
      future.setDate(future.getDate() + 7);
      setDeadline(future.toISOString().split('T')[0]);
      setAssigneeId(availableUsers[0]?.id || '');
      setError(null);
    }
  }, [task, isOpen, availableUsers]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = isEditing ? `/api/tasks/${task!.id}` : '/api/tasks';
      const method = isEditing ? 'PATCH' : 'POST';

      const payload = {
        title: title.trim(),
        description: description.trim(),
        priority,
        deadline: new Date(deadline).toISOString(),
        assigneeId,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save task.');
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
      title={isEditing ? 'Edit Task Specifications' : 'Provision New Task'}
      description={
        isEditing
          ? 'Modify priority, schedule, and assignees'
          : 'Define deliverables and assign to an eligible staff member'
      }
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="task-title" className="block text-xs font-semibold text-slate-700 mb-1">
            Task Title
          </label>
          <input
            id="task-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Implement Zero-Trust JWT Edge Gateway"
            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label
            htmlFor="task-desc"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            Description &amp; Acceptance Criteria
          </label>
          <textarea
            id="task-desc"
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description of task deliverables and technical boundaries..."
            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="task-priority"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Priority Level
            </label>
            <select
              id="task-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="task-deadline"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Target Deadline
            </label>
            <input
              id="task-deadline"
              type="date"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
            </input>
          </div>
        </div>

        <div>
          <label
            htmlFor="task-assignee"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            Assigned Employee
          </label>
          <select
            id="task-assignee"
            required
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {availableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.title} · {u.department})
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-slate-400">
            Assigned personnel must have an active status in your supervisory tree.
          </p>
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
            {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
