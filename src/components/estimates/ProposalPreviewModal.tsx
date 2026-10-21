import React, { useState } from 'react';
import { Modal } from '../ui/Modal.tsx';
import type { Estimate, PricingDisplayMode } from '../../types/index.ts';
import {
  Printer,
  Mail,
  CheckCircle,
  Building2,
  Calendar,
  Layers,
  MapPin,
  Send,
  Sparkles,
  FileCheck2,
  AlertCircle,
} from 'lucide-react';

interface ProposalPreviewModalProps {
  estimate: Estimate | null;
  isOpen: boolean;
  onClose: () => void;
  onEstimateUpdated: () => void;
  onNavigateToProjects?: () => void;
}

export function ProposalPreviewModal({
  estimate,
  isOpen,
  onClose,
  onEstimateUpdated,
  onNavigateToProjects,
}: ProposalPreviewModalProps) {
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const [simulatingAcceptance, setSimulatingAcceptance] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!estimate) return null;

  const handleOpenEmail = () => {
    setEmailTo(estimate.clientEmail);
    setEmailSubject(`Proposal ${estimate.proposalNumber} — ${estimate.projectName}`);
    setEmailMessage(
      `Dear ${estimate.clientName},\n\nPlease find attached our formal scope proposal and quotation (${estimate.proposalNumber}) for ${estimate.projectName} at ${estimate.projectAddress}.\n\nThis proposal is valid until ${new Date(estimate.validUntil).toLocaleDateString()}.\n\nBest regards,\n${estimate.preparedBy}\n${estimate.preparedByTitle}`
    );
    setEmailModalOpen(true);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingEmail(true);
    setError(null);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailTo,
          subject: emailSubject,
          body: emailMessage,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to dispatch proposal email');
      }

      setEmailModalOpen(false);
      setActionSuccess('Proposal successfully emailed to client and marked as SENT.');
      onEstimateUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error sending proposal email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSimulateAcceptance = async () => {
    setSimulatingAcceptance(true);
    setError(null);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/accept`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to accept proposal');
      }

      const result = await res.json();
      setActionSuccess(`Proposal accepted! Project "${result.project.name}" has been provisioned.`);
      onEstimateUpdated();
      if (onNavigateToProjects) {
        setTimeout(() => {
          onClose();
          onNavigateToProjects();
        }, 1200);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error accepting proposal');
    } finally {
      setSimulatingAcceptance(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const mode: PricingDisplayMode = estimate.pricingMode || 'LINE_ITEM';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Formal Proposal Preview • ${estimate.proposalNumber}`}
      description={`Client presentation formatted under "${mode.replace('_', ' ')}" pricing mode.`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Action Header Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Mode:</span>
            <span className="px-2.5 py-1 text-xs font-bold bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200">
              {mode === 'LINE_ITEM' && 'Itemized Line Items'}
              {mode === 'SECTION' && 'Section Subtotals Only'}
              {mode === 'TOTAL_ONLY' && 'Project Lump Sum Only'}
              {mode === 'SCOPE_ONLY' && 'Scope Specifications Only (Tender)'}
            </span>
            <span className="text-xs text-slate-400">
              • Status: <strong className="text-slate-700">{estimate.stage}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-2xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print / PDF</span>
            </button>

            <button
              type="button"
              onClick={handleOpenEmail}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 shadow-2xs transition-colors"
            >
              <Mail className="w-3.5 h-3.5 text-indigo-600" />
              <span>Email Client</span>
            </button>

            {estimate.stage !== 'WON' && (
              <button
                type="button"
                onClick={handleSimulateAcceptance}
                disabled={simulatingAcceptance}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{simulatingAcceptance ? 'Promoting...' : 'Simulate Client Acceptance'}</span>
              </button>
            )}
          </div>
        </div>

        {actionSuccess && (
          <div className="p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {error && (
          <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Printable Proposal Document Body */}
        <div className="p-8 sm:p-10 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-800 space-y-8 font-sans">
          {/* Letterhead Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <Layers className="w-4 h-4" />
                </div>
                <span className="text-lg font-bold tracking-tight text-slate-900">
                  WorkPulse Commercial Solutions
                </span>
              </div>
              <p className="text-xs text-slate-500">
                100 King Street West, Suite 5600 • Toronto, ON M5X 1C9
              </p>
              <p className="text-xs text-slate-500">
                Tel: (416) 555-0100 • contracting@workpulse.io
              </p>
            </div>

            <div className="sm:text-right">
              <span className="inline-block px-3 py-1 bg-slate-900 text-white font-mono text-xs font-bold rounded uppercase tracking-wider mb-2">
                Scope Proposal
              </span>
              <div className="text-sm font-bold text-slate-900 font-mono">
                {estimate.proposalNumber}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Date: {new Date(estimate.proposalDate).toLocaleDateString()}
              </div>
              <div className="text-xs text-rose-600 font-semibold mt-0.5">
                Valid Until: {new Date(estimate.validUntil).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Client & Project Information Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs">
            <div>
              <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                Prepared For
              </div>
              <div className="font-bold text-slate-900 text-sm">{estimate.clientCompany}</div>
              <div className="text-slate-700 mt-0.5">Attn: {estimate.clientName}</div>
              <div className="text-slate-600">{estimate.clientEmail}</div>
              <div className="text-slate-600">{estimate.clientPhone}</div>
            </div>

            <div>
              <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                Project Scope Location
              </div>
              <div className="font-bold text-slate-900 text-sm">{estimate.projectName}</div>
              <div className="text-slate-700 mt-0.5 flex items-start gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{estimate.projectAddress}</span>
              </div>
            </div>
          </div>

          {/* Scope Sections & Line Items Table */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-200">
              Detailed Scope of Work &amp; Specifications
            </h3>

            {estimate.sections.map((section, idx) => (
              <div key={section.id || idx} className="space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80">
                  <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                    {idx + 1}.0 {section.name}
                  </h4>
                  {mode === 'SECTION' && (
                    <span className="text-xs font-bold text-slate-900 font-mono">
                      ${section.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        <th className="py-2 pr-4 font-semibold">Item &amp; Description</th>
                        {mode === 'LINE_ITEM' && (
                          <>
                            <th className="py-2 px-3 text-right font-semibold">Qty</th>
                            <th className="py-2 px-3 text-right font-semibold">Unit</th>
                            <th className="py-2 px-3 text-right font-semibold">Unit Price</th>
                            <th className="py-2 pl-3 text-right font-semibold">Total</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {section.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 pr-4 align-top">
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {item.isExclusion && (
                                <span className="px-1.5 py-0.2 bg-rose-50 text-rose-700 text-[10px] font-bold rounded">
                                  EXCLUSION
                                </span>
                              )}
                              <span>{item.title}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                              {item.description}
                            </p>
                          </td>

                          {mode === 'LINE_ITEM' && (
                            <>
                              <td className="py-2.5 px-3 text-right align-top font-mono text-slate-700">
                                {item.isExclusion ? '-' : item.quantity}
                              </td>
                              <td className="py-2.5 px-3 text-right align-top text-slate-500">
                                {item.isExclusion ? '-' : item.unit}
                              </td>
                              <td className="py-2.5 px-3 text-right align-top font-mono text-slate-700">
                                {item.isExclusion
                                  ? '-'
                                  : `$${item.unitPrice.toLocaleString('en-US', {
                                      minimumFractionDigits: 2,
                                    })}`}
                              </td>
                              <td className="py-2.5 pl-3 text-right align-top font-mono font-semibold text-slate-900">
                                {item.isExclusion
                                  ? '$0.00'
                                  : `$${item.total.toLocaleString('en-US', {
                                      minimumFractionDigits: 2,
                                    })}`}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {/* Proposal Financial Summary (Hidden in SCOPE_ONLY) */}
          {mode !== 'SCOPE_ONLY' && (
            <div className="pt-6 border-t border-slate-200 flex justify-end">
              <div className="w-full sm:w-80 space-y-2 text-xs">
                {mode === 'LINE_ITEM' && (
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Base Scope Subtotal:</span>
                    <span className="font-mono">
                      ${estimate.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total Proposed Investment:</span>
                  <span className="font-mono text-base text-indigo-700">
                    ${estimate.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 text-right">
                  HST (13%) calculated upon progress invoicing
                </div>
              </div>
            </div>
          )}

          {/* Additional Terms & Notes */}
          {estimate.notes && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
              <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                Contract Clarifications &amp; Terms
              </div>
              <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                {estimate.notes}
              </p>
            </div>
          )}

          {/* Signatures & Execution Section */}
          <div className="pt-8 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">
                Submitted By
              </div>
              <div className="font-bold text-slate-900">{estimate.preparedBy}</div>
              <div className="text-slate-500">{estimate.preparedByTitle}</div>
              <div className="text-slate-400 mt-1">WorkPulse Commercial Electrical Systems</div>
              <div className="mt-6 border-b border-slate-300 w-48" />
              <div className="text-[10px] text-slate-400 mt-1">Authorized Signature</div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">
                Client Acceptance &amp; Notice to Proceed
              </div>
              <p className="text-[11px] text-slate-500 mb-6">
                By signing below, the Client authorizes WorkPulse to initiate procurement and scheduling.
              </p>
              <div className="mt-6 border-b border-slate-300 w-48" />
              <div className="text-[10px] text-slate-400 mt-1">Client Signature &amp; Date</div>
            </div>
          </div>
        </div>

        {/* Send Email Modal Form */}
        {emailModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  <span>Email Client Proposal</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEmailModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSendEmail} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">To</label>
                  <input
                    type="email"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Message</label>
                  <textarea
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono text-[11px]"
                    required
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEmailModalOpen(false)}
                    className="px-4 py-2 font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingEmail}
                    className="flex items-center gap-1.5 px-4 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sendingEmail ? 'Sending...' : 'Send Proposal Email'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
