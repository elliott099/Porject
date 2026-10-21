import React, { useState } from 'react';
import { Modal } from '../ui/Modal.tsx';
import { Receipt, DollarSign, Calendar, Building, CheckCircle2 } from 'lucide-react';

interface ExpenseModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ExpenseModal({
  projectId,
  isOpen,
  onClose,
  onSuccess,
}: ExpenseModalProps) {
  const [type, setType] = useState<'MATERIAL' | 'REIMBURSEMENT'>('MATERIAL');
  const [vendorOrEmployee, setVendorOrEmployee] = useState('Nedco Electrical Supply');
  const [category, setCategory] = useState('Conduit & Wire');
  const [amount, setAmount] = useState<number>(1450);
  const [receiptNote, setReceiptNote] = useState('PO-8821: 500ft 3/4" EMT, 250ft 10/3 RW90 copper spool.');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorOrEmployee.trim() || amount <= 0) {
      setError('Please provide vendor/recipient name and positive amount.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          vendorOrEmployee: vendorOrEmployee.trim(),
          category: category.trim(),
          amount: Number(amount),
          receiptNote: receiptNote.trim(),
          date: new Date(date).toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to record expense');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error recording expense');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Jobsite Material &amp; Expense"
      description="Post vendor invoice or employee reimbursement against project budget."
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            {error}
          </div>
        )}

        {/* Expense Type Toggle */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setType('MATERIAL');
              setVendorOrEmployee('Nedco Electrical Supply');
            }}
            className={`flex-1 py-1.5 font-semibold rounded-md transition-all ${
              type === 'MATERIAL'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Direct Material PO / Supplier
          </button>
          <button
            type="button"
            onClick={() => {
              setType('REIMBURSEMENT');
              setVendorOrEmployee('Field Employee Reimbursement');
            }}
            className={`flex-1 py-1.5 font-semibold rounded-md transition-all ${
              type === 'REIMBURSEMENT'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Employee Expense / Petty Cash
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {type === 'MATERIAL' ? 'Vendor / Wholesaler' : 'Employee Name'}
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={vendorOrEmployee}
                onChange={(e) => setVendorOrEmployee(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Expense Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
            >
              <option value="Conduit & Wire">Conduit &amp; Wire</option>
              <option value="Distribution & Panels">Distribution &amp; Panels</option>
              <option value="Lighting Fixtures">Lighting Fixtures</option>
              <option value="Devices & Receptacles">Devices &amp; Receptacles</option>
              <option value="Safety & Tools">Safety &amp; Tools</option>
              <option value="Mileage & Fuel">Mileage &amp; Fuel</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Amount ($)</label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-semibold"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Receipt / Purchase Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
              required
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Receipt / PO Reference Note</label>
          <textarea
            rows={2}
            value={receiptNote}
            onChange={(e) => setReceiptNote(e.target.value)}
            placeholder="Invoice number, slip ID, or itemized receipt notes..."
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg resize-none"
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
            <span>{submitting ? 'Posting...' : 'Post Expense'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
