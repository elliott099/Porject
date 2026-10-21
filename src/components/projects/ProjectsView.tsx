import React, { useState } from 'react';
import type { Project, ProjectPhase, SafeUser } from '../../types/index.ts';
import { ProjectWorkspace } from './ProjectWorkspace.tsx';
import { ProjectModal } from './ProjectModal.tsx';
import {
  Plus,
  Search,
  Briefcase,
  Building2,
  Calendar,
  DollarSign,
  ArrowRight,
  MapPin,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface ProjectsViewProps {
  projects: Project[];
  currentUser: SafeUser;
  availableUsers: SafeUser[];
  onRefresh: () => void;
}

export function ProjectsView({
  projects,
  currentUser,
  availableUsers,
  onRefresh,
}: ProjectsViewProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [phaseFilter, setPhaseFilter] = useState<'ALL' | ProjectPhase>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [projectModalOpen, setProjectModalOpen] = useState(false);

  // If a project is selected, render its dedicated 4-tab workspace
  if (selectedProject) {
    const freshProject = projects.find((p) => p.id === selectedProject.id) || selectedProject;
    return (
      <ProjectWorkspace
        project={freshProject}
        currentUser={currentUser}
        onBack={() => setSelectedProject(null)}
        onRefresh={onRefresh}
      />
    );
  }

  const filteredProjects = projects.filter((p) => {
    if (phaseFilter !== 'ALL' && p.phase !== phaseFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.clientCompany.toLowerCase().includes(q) ||
      p.clientName.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      p.assignedPmName.toLowerCase().includes(q)
    );
  });

  const canCreate = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER';

  const totalPortfolioValue = projects.reduce((sum, p) => sum + p.contractValue, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Project Operations &amp; Delivery Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Supervise project phases from preconstruction to commissioning, milestone checklists, billing schedules, and job costing.
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() => setProjectModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Provision Project</span>
          </button>
        )}
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Active Projects
          </span>
          <span className="text-xl font-extrabold text-slate-900 mt-1 block">
            {projects.length}
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Preconstruction Phase
          </span>
          <span className="text-xl font-extrabold text-purple-700 mt-1 block">
            {projects.filter((p) => p.phase === 'PRECONSTRUCTION').length}
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Construction Phase
          </span>
          <span className="text-xl font-extrabold text-indigo-700 mt-1 block">
            {projects.filter((p) => p.phase === 'CONSTRUCTION').length}
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Contract Portfolio
          </span>
          <span className="text-xl font-extrabold text-emerald-700 font-mono mt-1 block">
            ${totalPortfolioValue.toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by title, client, or site address..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Phase Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {(['ALL', 'PRECONSTRUCTION', 'CONSTRUCTION', 'CLOSEOUT'] as const).map((ph) => {
            const count =
              ph === 'ALL' ? projects.length : projects.filter((p) => p.phase === ph).length;
            const active = phaseFilter === ph;
            return (
              <button
                key={ph}
                type="button"
                onClick={() => setPhaseFilter(ph)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  active
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {ph === 'ALL' ? 'All Phases' : ph.charAt(0) + ph.slice(1).toLowerCase()} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Project Cards Grid */}
      {filteredProjects.length === 0 ? (
        <div className="p-12 text-center bg-white border border-dashed border-slate-200 rounded-2xl space-y-2">
          <Briefcase className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-900">No projects found</h3>
          <p className="text-xs text-slate-500">
            Provision a new project or accept an estimate from the proposal pipeline.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((proj) => {
            const completedMilestones = proj.milestones.filter((m) => m.completed).length;
            const milestonePercent =
              proj.milestones.length > 0
                ? Math.round((completedMilestones / proj.milestones.length) * 100)
                : 0;

            const totalInvoiced = proj.invoices.reduce((sum, inv) => sum + inv.amount, 0);

            return (
              <div
                key={proj.id}
                onClick={() => setSelectedProject(proj)}
                className="p-5 bg-white border border-slate-200 hover:border-indigo-400 rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer group space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Phase & Contract Value Header */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        proj.phase === 'PRECONSTRUCTION'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : proj.phase === 'CONSTRUCTION'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {proj.phase}
                    </span>

                    <span className="font-mono text-sm font-extrabold text-slate-900">
                      ${proj.contractValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {proj.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{proj.clientCompany}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{proj.address}</span>
                  </div>

                  {/* Milestone Progress Bar */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Schedule Milestones</span>
                      <span className="font-semibold text-slate-700">
                        {completedMilestones} / {proj.milestones.length} ({milestonePercent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${milestonePercent}%` }}
                        className="bg-indigo-600 h-full rounded-full transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer PM & Open Workspace Action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="text-[11px] text-slate-500 truncate pr-2">
                    PM: <span className="font-semibold text-slate-800">{proj.assignedPmName}</span>
                  </div>

                  <span className="text-xs font-semibold text-indigo-600 group-hover:underline flex items-center gap-1 shrink-0">
                    <span>Manage</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Provision Project Modal */}
      <ProjectModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onSuccess={() => onRefresh()}
        availableUsers={availableUsers}
      />
    </div>
  );
}
