import React, { useState } from 'react';
import { Modal } from '../ui/Modal.tsx';
import { DollarSign, Calendar, FileText, CheckCircle2 } from 'lucide-react';

interface InvoiceModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InvoiceModal({
  projectId,
  isOpen,
  onClose,
  onSuccess,
}: InvoiceModalProps) {
  const [invoiceNumber, setInvoiceNumber] = useState(
    `INV-2026-${Math.floor(100 + Math.random() * 900)}`
  );
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );
  const [amount, setAmount] = useState<number>(5000);
  const [notes, setNotes] = useState('Progress billing #1: Mobilization, rough-in conduit & subpanel.');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 13% HST automatic calculation
  const hst = Number((amount * 0.13).toFixed(2));
  const totalWithHst = Number((amount + hst).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber.trim() || amount <= 0) {
      setError('Please provide a valid invoice number and positive billing amount.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: invoiceNumber.trim(),
          issueDate: new Date(issueDate).toISOString(),
          dueDate: new Date(dueDate).toISOString(),
          amount: Number(amount),
          notes: notes.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create invoice');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error generating invoice');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Progress Billing Invoice"
      description="Issue milestone invoice with automated 13% HST tax calculation."
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Invoice Number</label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-semibold"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Issue Date</label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payment Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Billing Amount (Pre-Tax)</label>
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
        </div>

        {/* 13% HST Auto-calculation Card */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 font-mono">
          <div className="flex items-center justify-between text-slate-600">
            <span>Net Billing Amount:</span>
            <span>${amount.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>HST Tax (13%):</span>
            <span>${hst.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
            <span>Total Invoice Due:</span>
            <span className="text-indigo-700">${totalWithHst.toFixed(2)}</span>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Line Description / Milestone Notes</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
            <span>{submitting ? 'Generating...' : 'Issue Invoice'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
