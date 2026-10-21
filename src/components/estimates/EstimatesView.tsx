import React, { useState } from 'react';
import type {
  Estimate,
  EstimateStage,
  ScopeTemplate,
  SafeUser,
} from '../../types/index.ts';
import { ProposalBuilder } from './ProposalBuilder.tsx';
import { ProposalPreviewModal } from './ProposalPreviewModal.tsx';
import {
  Plus,
  Search,
  Eye,
  Edit,
  ArrowRight,
  Calculator,
  CheckCircle,
  Building2,
  DollarSign,
  Calendar,
  Layers,
  Inbox,
  Send,
  Trophy,
  XCircle,
  Archive,
  Clock,
  Sparkles,
} from 'lucide-react';

interface EstimatesViewProps {
  estimates: Estimate[];
  templates: ScopeTemplate[];
  currentUser: SafeUser;
  onRefresh: () => void;
  onNavigateToProjects?: () => void;
}

export function EstimatesView({
  estimates,
  templates,
  currentUser,
  onRefresh,
  onNavigateToProjects,
}: EstimatesViewProps) {
  const [activeTab, setActiveTab] = useState<EstimateStage>('NEW_INQUIRY');
  const [searchQuery, setSearchQuery] = useState('');

  // Mode: list vs builder
  const [editingEstimate, setEditingEstimate] = useState<Estimate | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  // Preview modal
  const [previewEstimate, setPreviewEstimate] = useState<Estimate | null>(null);

  const tabs: { id: EstimateStage; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'NEW_INQUIRY', label: 'New Inquiry', icon: Inbox },
    { id: 'DRAFTS', label: 'Drafts', icon: Edit },
    { id: 'QUOTE_CREATION', label: 'Quote Creation', icon: Calculator },
    { id: 'SENT', label: 'Sent', icon: Send },
    { id: 'WON', label: 'Won', icon: Trophy },
    { id: 'LOST', label: 'Lost', icon: XCircle },
    { id: 'ARCHIVE', label: 'Archive', icon: Archive },
  ];

  const filteredEstimates = estimates.filter((est) => {
    if (est.stage !== activeTab) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      est.proposalNumber.toLowerCase().includes(q) ||
      est.projectName.toLowerCase().includes(q) ||
      est.clientCompany.toLowerCase().includes(q) ||
      est.clientName.toLowerCase().includes(q) ||
      est.projectAddress.toLowerCase().includes(q)
    );
  });

  const newInquiryCount = estimates.filter((e) => e.stage === 'NEW_INQUIRY').length;

  const handleStartNewEstimate = () => {
    setEditingEstimate(null);
    setIsBuilderOpen(true);
  };

  const handleEditEstimate = (estimate: Estimate) => {
    setEditingEstimate(estimate);
    setIsBuilderOpen(true);
  };

  const handleMoveStage = async (estimateId: string, newStage: EstimateStage) => {
    try {
      const res = await fetch(`/api/estimates/${estimateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error changing stage:', err);
    }
  };

  if (isBuilderOpen) {
    return (
      <ProposalBuilder
        initialEstimate={editingEstimate}
        templates={templates}
        currentUser={currentUser}
        onSaveSuccess={() => {
          setIsBuilderOpen(false);
          setEditingEstimate(null);
          onRefresh();
        }}
        onCancel={() => {
          setIsBuilderOpen(false);
          setEditingEstimate(null);
        }}
        onNavigateToProjects={onNavigateToProjects}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Estimates &amp; Proposal Builder Pipeline
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Turn customer drawings and inquiries into formal lump-sum or itemized proposals, calculate markups, and win bids.
          </p>
        </div>

        <button
          type="button"
          onClick={handleStartNewEstimate}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Proposal</span>
        </button>
      </div>

      {/* Pipeline Navigation Tabs with Red Badge for New Inquiry */}
      <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-2xs overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const count = estimates.filter((e) => e.stage === tab.id).length;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all relative ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>

                {/* Badge count */}
                {tab.id === 'NEW_INQUIRY' && count > 0 ? (
                  <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-rose-500 text-white rounded-full animate-pulse">
                    {count}
                  </span>
                ) : (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] rounded-full font-medium ${
                      isActive ? 'bg-indigo-700/60 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Filter ${activeTab.replace('_', ' ').toLowerCase()} proposals...`}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>
            Total in stage: <strong className="text-slate-900">{filteredEstimates.length}</strong>
          </span>
          <span className="h-3 w-px bg-slate-200" />
          <span>
            Stage Value:{' '}
            <strong className="text-indigo-700 font-mono">
              $
              {filteredEstimates
                .reduce((sum, e) => sum + e.total, 0)
                .toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </strong>
          </span>
        </div>
      </div>

      {/* Estimates Cards / Table */}
      {filteredEstimates.length === 0 ? (
        <div className="p-12 text-center bg-white border border-dashed border-slate-200 rounded-2xl space-y-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Calculator className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">
            No proposals currently in {activeTab.replace('_', ' ')}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {activeTab === 'NEW_INQUIRY'
              ? 'Leads sent from the CRM Lead Manager will appear here ready to be moved into Drafts.'
              : 'You can draft new estimates or advance proposals through the workflow stages.'}
          </p>
          {activeTab === 'NEW_INQUIRY' && (
            <button
              type="button"
              onClick={handleStartNewEstimate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Direct Proposal</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEstimates.map((estimate) => (
            <div
              key={estimate.id}
              className="p-5 bg-white border border-slate-200 hover:border-indigo-400 rounded-xl shadow-2xs hover:shadow-xs transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header row: Proposal # & Total */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {estimate.proposalNumber}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1.5 line-clamp-1">
                      {estimate.projectName}
                    </h3>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block text-[10px] uppercase font-semibold">
                      Contract Total
                    </span>
                    <span className="text-sm font-extrabold text-slate-900 font-mono">
                      ${estimate.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Client & Address */}
                <div className="space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 text-slate-800 font-medium truncate">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{estimate.clientCompany}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 pl-5 truncate">
                    {estimate.clientName} • {estimate.projectAddress}
                  </div>
                </div>

                {/* Details Pills: Sections & Margin */}
                <div className="flex flex-wrap items-center gap-2 text-[10px] pt-1 border-t border-slate-100">
                  <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">
                    {estimate.sections.length} Scope Categories
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded font-semibold">
                    {estimate.marginPercent}% Margin
                  </span>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-medium">
                    {estimate.pricingMode.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Issued: {new Date(estimate.proposalDate).toLocaleDateString()}</span>
                  <span>Expires: {new Date(estimate.validUntil).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPreviewEstimate(estimate)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Interactive Proposal Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEditEstimate(estimate)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Edit in Proposal Builder"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>

                {/* Stage Progression Flow Buttons */}
                {activeTab === 'NEW_INQUIRY' && (
                  <button
                    type="button"
                    onClick={() => handleMoveStage(estimate.id, 'DRAFTS')}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs"
                  >
                    <span>Accept to Drafts</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {activeTab === 'DRAFTS' && (
                  <button
                    type="button"
                    onClick={() => handleEditEstimate(estimate)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs"
                  >
                    <span>Open Quote Builder</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {activeTab === 'QUOTE_CREATION' && (
                  <button
                    type="button"
                    onClick={() => setPreviewEstimate(estimate)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs"
                  >
                    <span>Ready • Send</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {activeTab === 'SENT' && (
                  <button
                    type="button"
                    onClick={() => setPreviewEstimate(estimate)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs"
                  >
                    <span>Client Acceptance</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live Preview & Dispatch Modal */}
      <ProposalPreviewModal
        estimate={previewEstimate}
        isOpen={Boolean(previewEstimate)}
        onClose={() => setPreviewEstimate(null)}
        onEstimateUpdated={() => {
          onRefresh();
          setPreviewEstimate(null);
        }}
        onNavigateToProjects={onNavigateToProjects}
      />
    </div>
  );
}
