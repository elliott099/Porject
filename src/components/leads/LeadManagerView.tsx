import React, { useState } from 'react';
import type { Lead, Client } from '../../types/index.ts';
import { LeadModal } from './LeadModal.tsx';
import { LeadDetailsModal } from './LeadDetailsModal.tsx';
import {
  Plus,
  Search,
  Building2,
  MapPin,
  Calendar,
  ArrowRight,
  Calculator,
  UploadCloud,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface LeadManagerViewProps {
  leads: Lead[];
  clients: Client[];
  onRefresh: () => void;
  onNavigateToEstimates?: () => void;
}

export function LeadManagerView({
  leads,
  clients,
  onRefresh,
  onNavigateToEstimates,
}: LeadManagerViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [selectedLeadForDetails, setSelectedLeadForDetails] = useState<Lead | null>(null);

  const filteredLeads = leads.filter((lead) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      lead.clientName.toLowerCase().includes(q) ||
      lead.clientCompany.toLowerCase().includes(q) ||
      lead.projectAddress.toLowerCase().includes(q) ||
      lead.referralSource.toLowerCase().includes(q)
    );
  });

  const stages = [
    {
      id: 'NEW_LEADS' as const,
      title: '1. New Inbound Leads',
      subtitle: 'Recently captured inquiries awaiting initial qualification',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      id: 'QUALIFIED' as const,
      title: '2. Qualified Pipeline',
      subtitle: 'Verified client budget, timeline, and decision-maker access',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    {
      id: 'DRAFT' as const,
      title: '3. Draft Scope & Handoff',
      subtitle: 'Collecting drawings & specs for the estimator handoff',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Sales &amp; CRM Lead Pipeline
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Capture prospective client inquiries, log initial communications, attach drawings, and transition to estimating.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLeadModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Sales Lead</span>
          </button>
        </div>
      </div>

      {/* Search Bar & Summary Stats */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads by client, company, or address..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="font-semibold text-slate-900">{leads.length}</span>
            <span>Total Leads</span>
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-1.5 text-amber-600 font-medium">
            <span className="font-semibold">{leads.filter((l) => l.stage === 'DRAFT').length}</span>
            <span>In Draft Scope</span>
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <span className="font-semibold">
              {leads.filter((l) => l.stage === 'SENT_TO_ESTIMATING').length}
            </span>
            <span>Transferred to Estimating</span>
          </div>
        </div>
      </div>

      {/* 3-Column Pipeline Stages View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {stages.map((stage) => {
          const stageLeads = filteredLeads.filter((l) => l.stage === stage.id);

          return (
            <div
              key={stage.id}
              className="bg-slate-100/70 rounded-xl border border-slate-200/80 p-4 flex flex-col min-h-[480px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                  {stage.title}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${stage.badgeColor}`}>
                  {stageLeads.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-4">{stage.subtitle}</p>

              {/* Cards List */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {stageLeads.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-slate-200 rounded-lg bg-white/50 text-xs text-slate-400">
                    No leads in this stage
                  </div>
                ) : (
                  stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => setSelectedLeadForDetails(lead)}
                      className="p-4 bg-white border border-slate-200 hover:border-indigo-400 rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer group space-y-3"
                    >
                      {/* Company & Client */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 shrink-0" />
                            <span>{lead.clientCompany}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {lead.clientName}
                          </div>
                        </div>

                        <span className="text-[10px] text-slate-400 font-mono">
                          {lead.id.slice(-6)}
                        </span>
                      </div>

                      {/* Project Address */}
                      <div className="flex items-start gap-1.5 text-[11px] text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{lead.projectAddress}</span>
                      </div>

                      {/* Referral & Date Tag */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">
                          {lead.referralSource}
                        </span>
                        <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
                      </div>

                      {/* Contact & Attachment Metrics */}
                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <div className="flex items-center gap-3 text-slate-500">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3 text-slate-400" />
                            {lead.contactLogs.length}
                          </span>
                          <span className="flex items-center gap-1">
                            <UploadCloud className="w-3 h-3 text-slate-400" />
                            {lead.attachments.length}
                          </span>
                        </div>

                        <span className="text-[11px] text-indigo-600 font-semibold group-hover:underline flex items-center gap-1">
                          Manage <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Bottom Quick Action for Stage */}
              {stage.id === 'NEW_LEADS' && (
                <button
                  type="button"
                  onClick={() => setLeadModalOpen(true)}
                  className="mt-3 w-full py-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-white border border-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Lead</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Recently Handed-Off Leads to Estimating */}
      {leads.filter((l) => l.stage === 'SENT_TO_ESTIMATING').length > 0 && (
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <span>Leads Successfully Transferred to Estimating Inquiries</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                These leads have generated formal inquiry tickets in the proposal pipeline
              </p>
            </div>
            {onNavigateToEstimates && (
              <button
                type="button"
                onClick={onNavigateToEstimates}
                className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
              >
                <span>Go to Estimates Pipeline</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {leads
              .filter((l) => l.stage === 'SENT_TO_ESTIMATING')
              .map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLeadForDetails(lead)}
                  className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg hover:border-emerald-400 cursor-pointer transition-colors"
                >
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {lead.clientCompany}
                  </div>
                  <div className="text-[11px] text-slate-600 truncate mt-0.5">
                    {lead.clientName} • {lead.projectAddress}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-emerald-700 mt-2 font-semibold">
                    <span>Inquiry Created</span>
                    <span className="font-mono">{lead.estimateId || 'Ready'}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Create Lead Modal */}
      <LeadModal
        isOpen={leadModalOpen}
        onClose={() => setLeadModalOpen(false)}
        onSuccess={() => {
          onRefresh();
        }}
        clients={clients}
      />

      {/* Details & Handoff Drawer / Modal */}
      <LeadDetailsModal
        lead={selectedLeadForDetails}
        isOpen={Boolean(selectedLeadForDetails)}
        onClose={() => setSelectedLeadForDetails(null)}
        onSuccess={() => {
          onRefresh();
          // Update selected lead reference
          if (selectedLeadForDetails) {
            const updated = leads.find((l) => l.id === selectedLeadForDetails.id);
            if (updated) setSelectedLeadForDetails(updated);
          }
        }}
        onNavigateToEstimates={onNavigateToEstimates}
      />
    </div>
  );
}
