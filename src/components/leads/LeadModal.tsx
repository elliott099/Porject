import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal.tsx';
import type { Client } from '../../types/index.ts';
import { Building2, User, Phone, Mail, MapPin, Share2, FileText, CheckCircle2 } from 'lucide-react';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clients: Client[];
}

const ADDRESS_SUGGESTIONS = [
  '100 King St W, Suite 5600, Toronto, ON',
  '1858 Waterdown Road, Burlington, ON',
  '525 Warden Avenue, Scarborough, ON',
  '77 Bloor Street West, Toronto, ON',
  '250 Yonge Street, Suite 2200, Toronto, ON',
  '438 University Avenue, Toronto, ON',
  '1200 Aerowood Drive, Mississauga, ON',
];

const REFERRAL_SOURCES = [
  'Direct Outreach',
  'General Contractor Referral',
  'Architect Specification',
  'Repeat Commercial Client',
  'Website Inquiry',
  'Word of Mouth',
  'Trade Association',
];

export function LeadModal({ isOpen, onClose, onSuccess, clients }: LeadModalProps) {
  const [clientMode, setClientMode] = useState<'new' | 'existing'>('new');
  const [selectedClientId, setSelectedClientId] = useState('');
  
  // Fields
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [projectAddress, setProjectAddress] = useState('');
  const [referralSource, setReferralSource] = useState('Direct Outreach');
  const [firstNote, setFirstNote] = useState('');

  const [addressFilter, setAddressFilter] = useState('');
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync existing client fields when chosen
  useEffect(() => {
    if (clientMode === 'existing' && selectedClientId) {
      const cli = clients.find((c) => c.id === selectedClientId);
      if (cli) {
        setClientName(cli.name);
        setClientPhone(cli.phone);
        setClientEmail(cli.email);
        setClientCompany(cli.company);
        if (cli.address && !projectAddress) {
          setProjectAddress(cli.address);
        }
      }
    }
  }, [clientMode, selectedClientId, clients, projectAddress]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSubmitting(false);
      setClientMode('new');
      setSelectedClientId('');
      setClientName('');
      setClientPhone('');
      setClientEmail('');
      setClientCompany('');
      setProjectAddress('');
      setReferralSource('Direct Outreach');
      setFirstNote('');
      setShowAddressSuggestions(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!clientName.trim() || !clientEmail.trim() || !clientCompany.trim() || !projectAddress.trim()) {
      setError('Please fill in all required client and project fields.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim() || '(416) 555-0100',
          clientEmail: clientEmail.trim(),
          clientCompany: clientCompany.trim(),
          projectAddress: projectAddress.trim(),
          referralSource: referralSource.trim(),
          firstNote: firstNote.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create sales lead');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating sales lead');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAddresses = ADDRESS_SUGGESTIONS.filter((addr) =>
    addr.toLowerCase().includes(projectAddress.toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Sales Lead"
      description="Initialize prospective lead in the pipeline, record project parameters, and prepare for estimating handoff."
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            {error}
          </div>
        )}

        {/* Client Type Toggle */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setClientMode('new')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              clientMode === 'new'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            New Client Account
          </button>
          <button
            type="button"
            onClick={() => setClientMode('existing')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              clientMode === 'existing'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Existing Client ({clients.length})
          </button>
        </div>

        {/* Existing Client Searchable Selector */}
        {clientMode === 'existing' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Client from Directory <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">-- Choose existing client --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.company} ({c.email})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Client Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Client Contact Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Nolan Zimmerman"
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Company / Entity <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={clientCompany}
                onChange={(e) => setClientCompany(e.target.value)}
                placeholder="e.g. NZ Custom Homes Inc."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Work Email <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@domain.com"
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="(416) 555-0199"
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Project Address with Autocomplete Suggestions */}
        <div className="relative">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Project Site Address <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={projectAddress}
              onChange={(e) => {
                setProjectAddress(e.target.value);
                setShowAddressSuggestions(true);
              }}
              onFocus={() => setShowAddressSuggestions(true)}
              placeholder="Start typing project street address..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Autocomplete dropdown suggestion popup */}
          {showAddressSuggestions && filteredAddresses.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-h-40 overflow-y-auto">
              <div className="px-3 py-1 bg-slate-50 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Address Suggestions
              </div>
              {filteredAddresses.map((addr) => (
                <button
                  key={addr}
                  type="button"
                  onClick={() => {
                    setProjectAddress(addr);
                    setShowAddressSuggestions(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 transition-colors border-t border-slate-100 first:border-0"
                >
                  <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>{addr}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Referral Source */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Referral Source / Channel
          </label>
          <div className="relative">
            <Share2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <select
              value={referralSource}
              onChange={(e) => setReferralSource(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {REFERRAL_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* First Note / Scope Brief */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Initial Project Note / Scope Inquiries
          </label>
          <div className="relative">
            <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <textarea
              value={firstNote}
              onChange={(e) => setFirstNote(e.target.value)}
              rows={3}
              placeholder="e.g. Tenant renovation for 4,500 sq ft office. Needs new 200A distribution panel, LED fixture retrofits, and 32 dedicated workstation circuits."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting ? 'Creating Lead...' : 'Initialize Lead in Pipeline'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
