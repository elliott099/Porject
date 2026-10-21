import React, { useState, useEffect } from 'react';
import type {
  Estimate,
  ScopeSection,
  ScopeItem,
  ScopeTemplate,
  PricingDisplayMode,
  SafeUser,
} from '../../types/index.ts';
import { ProposalPreviewModal } from './ProposalPreviewModal.tsx';
import {
  Save,
  Eye,
  Plus,
  Trash2,
  Sparkles,
  Layers,
  Calculator,
  Calendar,
  Building2,
  CheckCircle,
  FileSpreadsheet,
  Percent,
  Sliders,
  DollarSign,
  AlertCircle,
  Info,
} from 'lucide-react';

interface ProposalBuilderProps {
  initialEstimate: Estimate | null;
  templates: ScopeTemplate[];
  currentUser: SafeUser;
  onSaveSuccess: () => void;
  onCancel: () => void;
  onNavigateToProjects?: () => void;
}

export function ProposalBuilder({
  initialEstimate,
  templates,
  currentUser,
  onSaveSuccess,
  onCancel,
  onNavigateToProjects,
}: ProposalBuilderProps) {
  // Form state
  const [proposalNumber, setProposalNumber] = useState(
    initialEstimate?.proposalNumber || `AZ-2026-${Math.floor(100 + Math.random() * 900)}`
  );
  const [clientCompany, setClientCompany] = useState(initialEstimate?.clientCompany || '');
  const [clientName, setClientName] = useState(initialEstimate?.clientName || '');
  const [clientEmail, setClientEmail] = useState(initialEstimate?.clientEmail || '');
  const [clientPhone, setClientPhone] = useState(initialEstimate?.clientPhone || '');
  const [projectAddress, setProjectAddress] = useState(initialEstimate?.projectAddress || '');
  const [projectName, setProjectName] = useState(
    initialEstimate?.projectName || 'Commercial Office Electrical Renovation'
  );

  const [proposalDate, setProposalDate] = useState(
    initialEstimate?.proposalDate
      ? initialEstimate.proposalDate.slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [validUntil, setValidUntil] = useState(
    initialEstimate?.validUntil
      ? initialEstimate.validUntil.slice(0, 10)
      : new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );

  // Sections
  const [sections, setSections] = useState<ScopeSection[]>(
    initialEstimate?.sections && initialEstimate.sections.length > 0
      ? initialEstimate.sections
      : templates[0]?.sections || []
  );

  // Internal costs
  const [materialCost, setMaterialCost] = useState<number>(
    initialEstimate?.internalCosts?.material ?? 6500
  );
  const [labourCost, setLabourCost] = useState<number>(
    initialEstimate?.internalCosts?.labour ?? 7200
  );
  const [licensingFee, setLicensingFee] = useState<number>(
    initialEstimate?.internalCosts?.licensingFee ?? 500
  );

  const [contingencyPercent, setContingencyPercent] = useState<number>(
    initialEstimate?.contingencyPercent ?? 5
  );
  const [marginPercent, setMarginPercent] = useState<number>(
    initialEstimate?.marginPercent ?? 20
  );

  // Pricing Mode
  const [pricingMode, setPricingMode] = useState<PricingDisplayMode>(
    initialEstimate?.pricingMode || 'LINE_ITEM'
  );

  // Notes & Sign-off
  const [notes, setNotes] = useState(
    initialEstimate?.notes ||
      'All materials CSA certified and compliant with the Ontario Electrical Safety Code (OESC).\nPermits and ESA inspection included in quotation.\nPayment terms: 30% mobilization deposit, 60% substantial completion, 10% final holdback.'
  );
  const [preparedBy, setPreparedBy] = useState(initialEstimate?.preparedBy || currentUser.name);
  const [preparedByTitle, setPreparedByTitle] = useState(
    initialEstimate?.preparedByTitle || currentUser.title || 'Senior Estimator & Project Manager'
  );

  // Modal states
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saveTemplateModalOpen, setSaveTemplateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Auto-recalculate scope subtotal from sections
  const calculateScopeSubtotal = () => {
    return sections.reduce((acc, sec) => acc + sec.subtotal, 0);
  };

  const scopeSubtotal = calculateScopeSubtotal();

  // Internal cost subtotal
  const internalCostsSubtotal = materialCost + labourCost + licensingFee;
  const contingencyAmount = (internalCostsSubtotal * contingencyPercent) / 100;
  const subtotalWithContingency = internalCostsSubtotal + contingencyAmount;
  const marginAmount = (subtotalWithContingency * marginPercent) / 100;
  const calculatedTotal = subtotalWithContingency + marginAmount;

  // Use higher of calculated internal costs or sum of line items to protect margin
  const finalProposalTotal = Math.max(scopeSubtotal, calculatedTotal);

  // Handlers for Scope Sections
  const handleAddSection = () => {
    const newSec: ScopeSection = {
      id: `sec-${Date.now()}`,
      name: 'New Scope Category',
      subtotal: 0,
      items: [],
    };
    setSections([...sections, newSec]);
  };

  const handleUpdateSectionName = (secIndex: number, name: string) => {
    const updated = [...sections];
    updated[secIndex].name = name;
    setSections(updated);
  };

  const handleDeleteSection = (secIndex: number) => {
    const updated = sections.filter((_, i) => i !== secIndex);
    setSections(updated);
  };

  const handleAddItem = (secIndex: number) => {
    const newItem: ScopeItem = {
      id: `it-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      title: 'Item Description',
      description: 'Scope specification details and compliance notes.',
      quantity: 1,
      unit: 'Lump Sum',
      unitPrice: 500,
      total: 500,
      isExclusion: false,
    };
    const updated = [...sections];
    updated[secIndex].items.push(newItem);
    recalculateSectionSubtotal(updated, secIndex);
    setSections(updated);
  };

  const handleUpdateItem = (
    secIndex: number,
    itemIndex: number,
    field: keyof ScopeItem,
    value: unknown
  ) => {
    const updated = [...sections];
    const item = { ...updated[secIndex].items[itemIndex], [field]: value };

    if (field === 'quantity' || field === 'unitPrice' || field === 'isExclusion') {
      if (item.isExclusion) {
        item.total = 0;
      } else {
        item.total = Number(item.quantity || 0) * Number(item.unitPrice || 0);
      }
    }

    updated[secIndex].items[itemIndex] = item;
    recalculateSectionSubtotal(updated, secIndex);
    setSections(updated);
  };

  const handleDeleteItem = (secIndex: number, itemIndex: number) => {
    const updated = [...sections];
    updated[secIndex].items = updated[secIndex].items.filter((_, i) => i !== itemIndex);
    recalculateSectionSubtotal(updated, secIndex);
    setSections(updated);
  };

  const recalculateSectionSubtotal = (secs: ScopeSection[], secIndex: number) => {
    secs[secIndex].subtotal = secs[secIndex].items.reduce(
      (sum, it) => (it.isExclusion ? sum : sum + it.total),
      0
    );
  };

  // Start from saved template
  const handleApplyTemplate = (templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    setSections(JSON.parse(JSON.stringify(tpl.sections)));
  };

  // Save current scope as a template
  const handleSaveAsTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    try {
      const res = await fetch('/api/scope-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplateName.trim(),
          description: `Custom template for ${projectName}`,
          sections,
          total: scopeSubtotal,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save scope template');
      }

      setSaveTemplateModalOpen(false);
      setNewTemplateName('');
      setSaveSuccessMessage('Scope template saved successfully to company registry!');
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error saving template');
    }
  };

  // Draft with AI helper
  const handleDraftWithAI = () => {
    const aiGeneratedSection: ScopeSection = {
      id: `sec-ai-${Date.now()}`,
      name: 'AI Generated Scope (Smart Specifications)',
      subtotal: 3200,
      items: [
        {
          id: `it-ai-1`,
          title: 'Occupancy Sensor Lighting Automation & Dimming Zones',
          description:
            'Install dual-technology ceiling-mount vacancy/occupancy passive infrared sensors in executive offices, meeting rooms, and rest areas for Title 24 & ASHRAE 90.1 energy efficiency compliance.',
          quantity: 8,
          unit: 'Units',
          unitPrice: 220,
          total: 1760,
          isExclusion: false,
        },
        {
          id: `it-ai-2`,
          title: 'Subpanel Feeders & Transient Voltage Surge Suppression',
          description:
            'Furnish and route high-conductivity copper feeders with dedicated neutral and equipment grounding conductor to distribution panelboard B-1.',
          quantity: 1,
          unit: 'Lump Sum',
          unitPrice: 1440,
          total: 1440,
          isExclusion: false,
        },
      ],
    };
    setSections([...sections, aiGeneratedSection]);
  };

  // Save or Update estimate
  const handleSaveEstimate = async (stage: Estimate['stage'] = 'DRAFTS') => {
    setError(null);
    setSaving(true);

    const payload = {
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim(),
      clientCompany: clientCompany.trim(),
      clientPhone: clientPhone.trim(),
      projectAddress: projectAddress.trim(),
      projectName: projectName.trim(),
      stage,
      proposalDate: new Date(proposalDate).toISOString(),
      validUntil: new Date(validUntil).toISOString(),
      sections,
      internalCosts: {
        material: materialCost,
        labour: labourCost,
        licensingFee,
      },
      contingencyPercent,
      marginPercent,
      subtotal: scopeSubtotal,
      contingencyAmount,
      marginAmount,
      total: finalProposalTotal,
      pricingMode,
      notes: notes.trim(),
      preparedBy: preparedBy.trim(),
      preparedByTitle: preparedByTitle.trim(),
    };

    try {
      let res;
      if (initialEstimate?.id) {
        res = await fetch(`/api/estimates/${initialEstimate.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/estimates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save proposal');
      }

      onSaveSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error saving proposal');
    } finally {
      setSaving(false);
    }
  };

  // Construct current estimate object for live preview
  const currentEstimateData: Estimate = {
    id: initialEstimate?.id || 'preview-temp',
    proposalNumber,
    clientName,
    clientEmail,
    clientCompany,
    clientPhone,
    projectAddress,
    projectName,
    stage: initialEstimate?.stage || 'DRAFTS',
    proposalDate: new Date(proposalDate).toISOString(),
    validUntil: new Date(validUntil).toISOString(),
    sections,
    internalCosts: {
      material: materialCost,
      labour: labourCost,
      licensingFee,
    },
    contingencyPercent,
    marginPercent,
    subtotal: scopeSubtotal,
    contingencyAmount,
    marginAmount,
    total: finalProposalTotal,
    pricingMode,
    notes,
    preparedBy,
    preparedByTitle,
    createdAt: initialEstimate?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-indigo-600 px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded">
              {proposalNumber}
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Proposal Builder &amp; Cost Estimator
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Craft itemized scopes, configure margins and contingency, and export professional client proposals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Back to List
          </button>

          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 shadow-2xs transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-600" />
            <span>Preview Proposal</span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveEstimate('DRAFTS')}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Estimate'}</span>
          </button>
        </div>
      </div>

      {saveSuccessMessage && (
        <div className="p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Proposal Details & Validity */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-4">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Building2 className="w-4 h-4 text-indigo-600" />
          <span>1. Proposal Details &amp; Client Coordinates</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Proposal Number</label>
            <input
              type="text"
              value={proposalNumber}
              onChange={(e) => setProposalNumber(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-semibold text-slate-800"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Proposal Issue Date</label>
            <input
              type="date"
              value={proposalDate}
              onChange={(e) => setProposalDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Valid Until Date</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
              />
              <button
                type="button"
                onClick={() =>
                  setValidUntil(new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10))
                }
                className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-semibold text-slate-700 whitespace-nowrap"
              >
                +15d
              </button>
              <button
                type="button"
                onClick={() =>
                  setValidUntil(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10))
                }
                className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-semibold text-slate-700 whitespace-nowrap"
              >
                +30d
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs pt-2">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Company / Entity</label>
            <input
              type="text"
              value={clientCompany}
              onChange={(e) => setClientCompany(e.target.value)}
              placeholder="e.g. NZ Custom Homes Inc."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Client Contact Name</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Nolan Zimmerman"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Client Email</label>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="nolan@customhomes.ca"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Project Name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Commercial Office Electrical Renovation"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
              required
            />
          </div>
        </div>

        <div className="text-xs">
          <label className="block font-semibold text-slate-700 mb-1">Project Site Address</label>
          <input
            type="text"
            value={projectAddress}
            onChange={(e) => setProjectAddress(e.target.value)}
            placeholder="e.g. 1858 Waterdown Road, Burlington, ON"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
            required
          />
        </div>
      </div>

      {/* 2. Scope of Work & Cost (with Reusable Templates) */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>2. Scope of Work &amp; Itemized Specifications</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Build your scope hierarchy with categorized sections, units, and rates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Start from saved scope template */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500">Template:</span>
              <select
                onChange={(e) => handleApplyTemplate(e.target.value)}
                defaultValue=""
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
              >
                <option value="" disabled>
                  -- Start from a saved scope template --
                </option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (${t.total.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            {/* Save current scope as template */}
            <button
              type="button"
              onClick={() => setSaveTemplateModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-2xs"
            >
              Save as Template
            </button>

            {/* Draft with AI Helper Button */}
            <button
              type="button"
              onClick={handleDraftWithAI}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Draft with AI</span>
            </button>
          </div>
        </div>

        {/* Sections List */}
        <div className="space-y-6">
          {sections.map((section, secIdx) => (
            <div
              key={section.id || secIdx}
              className="p-4 bg-slate-50/60 border border-slate-200 rounded-xl space-y-3"
            >
              {/* Section Header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                    {secIdx + 1}
                  </span>
                  <input
                    type="text"
                    value={section.name}
                    onChange={(e) => handleUpdateSectionName(secIdx, e.target.value)}
                    className="flex-1 max-w-sm px-2.5 py-1 text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-xs font-bold text-slate-800 font-mono">
                    Subtotal: ${section.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteSection(secIdx)}
                    title="Delete Section"
                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Items Table inside section */}
              <div className="space-y-2">
                {section.items.map((item, itIdx) => (
                  <div
                    key={item.id || itIdx}
                    className="p-3 bg-white border border-slate-200 rounded-lg space-y-2 text-xs shadow-2xs"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                      <div className="md:col-span-5">
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) =>
                            handleUpdateItem(secIdx, itIdx, 'title', e.target.value)
                          }
                          placeholder="Scope line title..."
                          className="w-full px-2 py-1 font-semibold text-slate-900 border border-slate-200 rounded"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateItem(secIdx, itIdx, 'quantity', parseFloat(e.target.value) || 0)
                            }
                            className="w-16 px-2 py-1 border border-slate-200 rounded font-mono text-right"
                          />
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) =>
                              handleUpdateItem(secIdx, itIdx, 'unit', e.target.value)
                            }
                            placeholder="Unit (LS, hr)"
                            className="w-20 px-2 py-1 border border-slate-200 rounded text-slate-600"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">$</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleUpdateItem(secIdx, itIdx, 'unitPrice', parseFloat(e.target.value) || 0)
                            }
                            className="w-full px-2 py-1 border border-slate-200 rounded font-mono text-right"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2 text-right font-mono font-bold text-slate-800">
                        {item.isExclusion
                          ? '$0.00'
                          : `$${item.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                      </div>

                      <div className="md:col-span-1 flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(secIdx, itIdx)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Detailed bulleted description */}
                    <textarea
                      rows={2}
                      value={item.description}
                      onChange={(e) =>
                        handleUpdateItem(secIdx, itIdx, 'description', e.target.value)
                      }
                      placeholder="Detailed bulleted or paragraph specifications for drawing review..."
                      className="w-full px-2.5 py-1.5 text-[11px] text-slate-600 border border-slate-100 bg-slate-50/50 rounded focus:bg-white resize-none"
                    />

                    {/* Exclusion checkbox */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(item.isExclusion)}
                          onChange={(e) =>
                            handleUpdateItem(secIdx, itIdx, 'isExclusion', e.target.checked)
                          }
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Mark as Scope Exclusion (Clarification only, zero fee)</span>
                      </label>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => handleAddItem(secIdx)}
                  className="w-full py-2 text-xs font-semibold text-indigo-600 hover:bg-white border border-dashed border-indigo-200 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item to {section.name}</span>
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddSection}
            className="w-full py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-4 h-4 text-indigo-600" />
            <span>Add New Scope Section</span>
          </button>
        </div>
      </div>

      {/* 3. Internal Costs, Contingency & Margin Calculator */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-4">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Calculator className="w-4 h-4 text-indigo-600" />
          <span>3. Internal Costs, Contingency &amp; Margin Calculator</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Internal Material Estimate ($)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400">$</span>
              <input
                type="number"
                min="0"
                step="any"
                value={materialCost}
                onChange={(e) => setMaterialCost(parseFloat(e.target.value) || 0)}
                className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Internal Labour Estimate ($)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400">$</span>
              <input
                type="number"
                min="0"
                step="any"
                value={labourCost}
                onChange={(e) => setLabourCost(parseFloat(e.target.value) || 0)}
                className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Licensing, Permits &amp; ESA Fee ($)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400">$</span>
              <input
                type="number"
                min="0"
                step="any"
                value={licensingFee}
                onChange={(e) => setLicensingFee(parseFloat(e.target.value) || 0)}
                className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>
        </div>

        {/* Sliders for Contingency & Margin */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Contingency Reserve</span>
              <span className="font-mono font-bold text-indigo-700">
                {contingencyPercent}% (+${contingencyAmount.toFixed(2)})
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="25"
              step="1"
              value={contingencyPercent}
              onChange={(e) => setContingencyPercent(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0% (Tight)</span>
              <span>10% (Standard)</span>
              <span>25% (High Risk)</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Contractor Profit Margin</span>
              <span className="font-mono font-bold text-emerald-700">
                {marginPercent}% (+${marginAmount.toFixed(2)})
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="45"
              step="1"
              value={marginPercent}
              onChange={(e) => setMarginPercent(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>5%</span>
              <span>20% (Target)</span>
              <span>45% (Specialty)</span>
            </div>
          </div>
        </div>

        {/* Calculator Output KPI Card */}
        <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1 text-xs">
            <div className="text-slate-600">
              Direct Internal Cost: <strong className="font-mono">${internalCostsSubtotal.toFixed(2)}</strong>
            </div>
            <div className="text-slate-600">
              Sum of Scope Line Items: <strong className="font-mono">${scopeSubtotal.toFixed(2)}</strong>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Proposed Contract Amount
            </div>
            <div className="text-xl font-extrabold text-indigo-700 font-mono">
              ${finalProposalTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Pricing Display Mode on Proposal (Radio Selection) */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
          <span>4. Pricing Display Mode on Client Proposal</span>
        </h3>
        <p className="text-[11px] text-slate-500">
          Control which financial tiers and breakdowns are visible when printing or emailing to the customer.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {[
            {
              id: 'LINE_ITEM' as const,
              title: 'LINE ITEM',
              desc: 'Shows each item with description, qty, unit, unit price, and total.',
            },
            {
              id: 'SECTION' as const,
              title: 'SECTION ONLY',
              desc: 'Shows item descriptions, hides unit prices/quantities, shows subtotals per section only.',
            },
            {
              id: 'TOTAL_ONLY' as const,
              title: 'TOTAL ONLY',
              desc: 'Shows work descriptions, conceals all line prices, shows only final project lump-sum total.',
            },
            {
              id: 'SCOPE_ONLY' as const,
              title: 'SCOPE ONLY (TENDER)',
              desc: 'Generates purely technical specifications with no pricing at all, for tender reviews.',
            },
          ].map((opt) => (
            <label
              key={opt.id}
              onClick={() => setPricingMode(opt.id)}
              className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                pricingMode === opt.id
                  ? 'bg-indigo-50/80 border-indigo-500 shadow-2xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="radio"
                    name="pricingMode"
                    value={opt.id}
                    checked={pricingMode === opt.id}
                    onChange={() => setPricingMode(opt.id)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-900">{opt.title}</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 5. Additional Notes & Prepared By */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-4">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          5. Additional Contract Terms &amp; Prepared By
        </h3>

        <div className="text-xs">
          <label className="block font-semibold text-slate-700 mb-1">
            Contract Clarifications &amp; Exclusions Notice
          </label>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Prepared By (Name)</label>
            <input
              type="text"
              value={preparedBy}
              onChange={(e) => setPreparedBy(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Prepared By (Title)</label>
            <input
              type="text"
              value={preparedByTitle}
              onChange={(e) => setPreparedByTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
              required
            />
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          Cancel
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-600" />
            <span>Interactive Proposal Preview</span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveEstimate('QUOTE_CREATION')}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save & Set Ready'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Proposal Preview Modal */}
      <ProposalPreviewModal
        estimate={currentEstimateData}
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onEstimateUpdated={() => {
          onSaveSuccess();
        }}
        onNavigateToProjects={onNavigateToProjects}
      />

      {/* Save Template Modal */}
      {saveTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Save Scope as Reusable Template</h3>
            <p className="text-xs text-slate-500">
              Save current sections ({sections.length} categories) to the enterprise template catalog for future estimates.
            </p>

            <form onSubmit={handleSaveAsTemplate} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Template Name</label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="e.g. Commercial Office (Expanded)"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSaveTemplateModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  Save to Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
