import React, { useState } from 'react';
import { Modal } from '../ui/Modal.tsx';
import type { Lead, ContactLog, LeadAttachment } from '../../types/index.ts';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Send,
  UploadCloud,
  FileCheck,
  CheckCircle,
  PhoneCall,
  MessageSquare,
  Users,
  FileText,
  ArrowRight,
  Calculator,
  Plus,
} from 'lucide-react';

interface LeadDetailsModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onNavigateToEstimates?: () => void;
}

export function LeadDetailsModal({
  lead,
  isOpen,
  onClose,
  onSuccess,
  onNavigateToEstimates,
}: LeadDetailsModalProps) {
  const [activeContactType, setActiveContactType] = useState<'EMAIL' | 'CALL' | 'TEXT' | 'MEETING'>('EMAIL');
  const [contactNote, setContactNote] = useState('');
  const [loggingContact, setLoggingContact] = useState(false);

  // File upload state
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('PDF Drawing / Spec');
  const [uploadingFile, setUploadingFile] = useState(false);

  // Transition state
  const [sendingToEstimating, setSendingToEstimating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!lead) return null;

  const handleLogContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactNote.trim()) return;

    setLoggingContact(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeContactType,
          note: contactNote.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to log contact attempt');
      }

      setContactNote('');
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error logging contact attempt');
    } finally {
      setLoggingContact(false);
    }
  };

  const handleAddAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) return;

    setUploadingFile(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fileName.trim(),
          size: `${(Math.random() * 4 + 1).toFixed(1)} MB`,
          type: fileType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to upload attachment');
      }

      setFileName('');
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error uploading attachment');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSendToEstimating = async () => {
    setSendingToEstimating(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/send-to-estimating`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send lead to estimating');
      }

      onSuccess();
      onClose();
      if (onNavigateToEstimates) {
        onNavigateToEstimates();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error handing off lead');
    } finally {
      setSendingToEstimating(false);
    }
  };

  const handleStageChange = async (newStage: Lead['stage']) => {
    setError(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to change stage');
      }
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error updating stage');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lead.clientCompany}
      description={`Sales Lead Details • ${lead.clientName} • Pipeline: ${lead.stage.replace('_', ' ')}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {error && (
          <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            {error}
          </div>
        )}

        {/* Stage Stepper Banner */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {(['NEW_LEADS', 'QUALIFIED', 'DRAFT'] as const).map((st, idx) => {
              const isCurrent = lead.stage === st;
              const labels = {
                NEW_LEADS: '1. New Lead',
                QUALIFIED: '2. Qualified',
                DRAFT: '3. Draft Scope',
              };
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleStageChange(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    isCurrent
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  {isCurrent && <CheckCircle className="w-3.5 h-3.5" />}
                  <span>{labels[st]}</span>
                </button>
              );
            })}
          </div>

          {/* Send to Estimating Handoff Button */}
          {lead.stage !== 'SENT_TO_ESTIMATING' ? (
            <button
              type="button"
              onClick={handleSendToEstimating}
              disabled={sendingToEstimating}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors shrink-0 disabled:opacity-50"
            >
              <Calculator className="w-4 h-4" />
              <span>{sendingToEstimating ? 'Creating Inquiry...' : 'Send to Estimating → Create Inquiry'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Transferred to Estimating Inquiry</span>
            </div>
          )}
        </div>

        {/* Lead Client Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white border border-slate-200 rounded-xl">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Contact &amp; Account
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-800">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-semibold">{lead.clientCompany}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <a href={`mailto:${lead.clientEmail}`} className="text-indigo-600 hover:underline">
                {lead.clientEmail}
              </a>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{lead.clientPhone}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Project Location &amp; Source
            </div>
            <div className="flex items-start gap-2 text-xs text-slate-800">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>{lead.projectAddress}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="font-medium text-slate-500">Source:</span>
              <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">
                {lead.referralSource}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Received {new Date(lead.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Initial First Note */}
        {lead.firstNote && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>First Inbound Note</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">{lead.firstNote}</p>
          </div>
        )}

        {/* Section 1: Log a Contact Attempt */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Log Client Contact Attempt
            </h4>
            <span className="text-[11px] text-slate-400">
              {lead.contactLogs.length} contact records
            </span>
          </div>

          <form onSubmit={handleLogContact} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { type: 'EMAIL' as const, label: 'Email Sent', icon: Send },
                { type: 'CALL' as const, label: 'Call Made', icon: PhoneCall },
                { type: 'TEXT' as const, label: 'Text Sent', icon: MessageSquare },
                { type: 'MEETING' as const, label: 'Meeting Held', icon: Users },
              ].map((btn) => {
                const Icon = btn.icon;
                const active = activeContactType === btn.type;
                return (
                  <button
                    key={btn.type}
                    type="button"
                    onClick={() => setActiveContactType(btn.type)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                      active
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-semibold'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{btn.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={contactNote}
                onChange={(e) => setContactNote(e.target.value)}
                placeholder={`Describe outcome for ${activeContactType.toLowerCase()} attempt (e.g. Left voicemail with Nolan re: drawings)...`}
                className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={loggingContact || !contactNote.trim()}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs disabled:opacity-50 shrink-0"
              >
                {loggingContact ? 'Saving...' : 'Log Attempt'}
              </button>
            </div>
          </form>

          {/* Contact Logs History Timeline */}
          {lead.contactLogs.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {lead.contactLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 bg-white border border-slate-100 rounded-lg flex items-start justify-between text-xs shadow-2xs"
                >
                  <div className="flex items-start gap-2">
                    <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-indigo-50 text-indigo-700 uppercase tracking-wider shrink-0 mt-0.5">
                      {log.type}
                    </span>
                    <div>
                      <p className="text-slate-800">{log.note}</p>
                      <span className="text-[10px] text-slate-400">
                        Logged by {log.actorName}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Files for the Estimator (Drawings, Specs, Photos) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-indigo-600" />
              <span>Files for the Estimator (Drawings, Specs, Photos)</span>
            </h4>
            <span className="text-[11px] text-slate-400">
              {lead.attachments.length} files attached
            </span>
          </div>

          <form onSubmit={handleAddAttachment} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="File name (e.g. Architectural_Floor_Plan_RevB.dwg, E-101_Power.pdf)..."
                className="flex-1 w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="PDF Drawing / Spec">PDF Drawing / Spec</option>
                <option value="AutoCAD DWG">AutoCAD DWG</option>
                <option value="Site Photo">Site Photo</option>
                <option value="Scope Checklist">Scope Checklist</option>
              </select>
              <button
                type="submit"
                disabled={uploadingFile || !fileName.trim()}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{uploadingFile ? 'Adding...' : 'Attach File'}</span>
              </button>
            </div>
          </form>

          {/* Attachments List */}
          {lead.attachments.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {lead.attachments.map((file) => (
                <div
                  key={file.id}
                  className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between shadow-2xs"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="truncate">
                      <div className="text-xs font-medium text-slate-800 truncate">
                        {file.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {file.type} • {file.size}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-indigo-600 font-semibold shrink-0 ml-2">
                    Ready
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-400">
              No architectural drawings or site photos attached yet.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            ID: <span className="font-mono">{lead.id}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
