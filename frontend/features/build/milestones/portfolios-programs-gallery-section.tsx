"use client";

import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared";
import { PM_FILL_PANEL, PmPageShell, PmSection } from "@/components/pm-chrome";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import {
  PORTFOLIO_TABLE_HEADERS,
  buildPortfolioColumns,
  PortfolioMobileCard,
} from "@/features/build/portfolios/portfolio-table-columns";
import {
  PROGRAM_TABLE_HEADERS,
  buildProgramColumns,
  ProgramMobileCard,
} from "@/features/build/programs/program-table-columns";
import type { Portfolio, Program } from "@/types/projects";
import { GalleryCase } from "./goals-gallery-section";

const NOOP = () => undefined;

const STUB_PORTFOLIOS: Portfolio[] = [
  { id: 10, orgId: "org-1", name: "Platform Modernisation", description: "Core infrastructure improvements", ownerId: "u1", status: "active", health: "on_track", strategicGoal: null, createdBy: "u1", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z", projectCount: 4 },
  { id: 11, orgId: "org-1", name: "Customer Growth", description: null, ownerId: "u2", status: "active", health: "at_risk", strategicGoal: "Reach $5M ARR", createdBy: "u2", createdAt: "2026-02-01T00:00:00Z", updatedAt: "2026-09-10T00:00:00Z", projectCount: 2 },
];

const STUB_PROGRAMS: Program[] = [
  { id: 10, orgId: "org-1", portfolioId: 10, name: "Cloud Migration", description: "Migrating to managed cloud", ownerId: "u1", status: "active", health: "on_track", createdBy: "u1", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z", projectCount: 3 },
  { id: 11, orgId: "org-1", portfolioId: null, name: "API Gateway V2", description: null, ownerId: null, status: "active", health: "at_risk", createdBy: "u2", createdAt: "2026-03-01T00:00:00Z", updatedAt: "2026-09-15T00:00:00Z", projectCount: 1 },
];

function PortfoliosToolbarGallery() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [health, setHealth] = useState("all");
  const handleClearAll = useCallback(() => { setSearch(""); setStatus("all"); setHealth("all"); }, []);
  return (
    <BuildListToolbar
      search={{ value: search, onValueChange: setSearch, placeholder: "Search portfolios…", label: "Search portfolios" }}
      filters={[
        { id: "status", label: "Status", active: status !== "all", control: <BuildFilterSelect label="Status" value={status} onValueChange={setStatus} options={[{ value: "all", label: "All statuses" }, { value: "active", label: "Active" }, { value: "on_hold", label: "On hold" }, { value: "completed", label: "Completed" }, { value: "archived", label: "Archived" }]} /> },
        { id: "health", label: "Health", active: health !== "all", control: <BuildFilterSelect label="Health" value={health} onValueChange={setHealth} options={[{ value: "all", label: "All health" }, { value: "on_track", label: "On track" }, { value: "at_risk", label: "At risk" }, { value: "off_track", label: "Off track" }]} /> },
      ]}
      onClearAll={handleClearAll}
    />
  );
}

function PortfoliosGalleryWrapper({ caseId, title, children }: { caseId: string; title: string; children: React.ReactNode }) {
  return (
    <GalleryCase id={caseId} title={title}>
      <PageWrapper title="Portfolios" subtitle="Group related projects into portfolios" actions={<BuildHeaderActions actions={[{ id: "new", label: "New portfolio", icon: Plus, primary: true }]} />} filters={<PortfoliosToolbarGallery />}>
        <PmPageShell>
          <PmSection index={0} className="flex min-h-0 flex-1 flex-col">{children}</PmSection>
        </PmPageShell>
      </PageWrapper>
    </GalleryCase>
  );
}

function PortfoliosReadyTable() {
  const columns = buildPortfolioColumns({ canManage: true, ownerOf: () => null, onEdit: NOOP, onDelete: NOOP });
  const renderMobileCard = useCallback((row: Portfolio) => <PortfolioMobileCard portfolio={row} canManage ownerOf={() => null} onEdit={NOOP} onDelete={NOOP} />, []);
  return (
    <DataTable data={STUB_PORTFOLIOS} columns={columns} getRowKey={(r) => r.id} mobileCard={renderMobileCard} className={PM_FILL_PANEL} pagination={{ mode: "cursor", pageSize: 20, hasMore: false, hasPrevious: false, onNext: NOOP, onPrevious: NOOP }} />
  );
}

function ProgramsToolbarGallery() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const handleClearAll = useCallback(() => { setSearch(""); setStatus("all"); }, []);
  return (
    <BuildListToolbar
      search={{ value: search, onValueChange: setSearch, placeholder: "Search programs…", label: "Search programs" }}
      filters={[
        { id: "status", label: "Status", active: status !== "all", control: <BuildFilterSelect label="Status" value={status} onValueChange={setStatus} options={[{ value: "all", label: "All statuses" }, { value: "active", label: "Active" }, { value: "on_hold", label: "On hold" }, { value: "completed", label: "Completed" }, { value: "archived", label: "Archived" }]} /> },
      ]}
      onClearAll={handleClearAll}
    />
  );
}

function ProgramsGalleryWrapper({ caseId, title, children }: { caseId: string; title: string; children: React.ReactNode }) {
  return (
    <GalleryCase id={caseId} title={title}>
      <PageWrapper title="Programs" subtitle="Coordinate related projects as a single program of work" actions={<BuildHeaderActions actions={[{ id: "new", label: "New program", icon: Plus, primary: true }]} />} filters={<ProgramsToolbarGallery />}>
        <PmPageShell>
          <PmSection index={0} className="flex min-h-0 flex-1 flex-col">{children}</PmSection>
        </PmPageShell>
      </PageWrapper>
    </GalleryCase>
  );
}

function ProgramsReadyTable() {
  const columns = buildProgramColumns({ canManage: true, ownerOf: () => null, portfolioName: () => "—", onEdit: NOOP, onDelete: NOOP });
  const renderMobileCard = useCallback((row: Program) => <ProgramMobileCard program={row} canManage ownerOf={() => null} portfolioName={() => "—"} onEdit={NOOP} onDelete={NOOP} />, []);
  return (
    <DataTable data={STUB_PROGRAMS} columns={columns} getRowKey={(r) => r.id} mobileCard={renderMobileCard} className={PM_FILL_PANEL} pagination={{ mode: "cursor", pageSize: 25, hasMore: false, hasPrevious: false, onNext: NOOP, onPrevious: NOOP }} />
  );
}

export function PortfoliosProgramsGalleryCases() {
  return (
    <>
      <PortfoliosGalleryWrapper caseId="portfolios-ready" title="Portfolios — populated">
        <PortfoliosReadyTable />
      </PortfoliosGalleryWrapper>

      <PortfoliosGalleryWrapper caseId="portfolios-loading" title="Portfolios — loading">
        <DataTableSkeleton mobileCards rows={8} headers={PORTFOLIO_TABLE_HEADERS} className="flex-1" />
      </PortfoliosGalleryWrapper>

      <PortfoliosGalleryWrapper caseId="portfolios-empty-true" title="Portfolios — true empty">
        <EmptyState className={PM_FILL_PANEL} illustrationPreset="projects" title="No portfolios yet" description="Create a portfolio to group and govern your projects." action={{ label: "New portfolio", onClick: NOOP }} />
      </PortfoliosGalleryWrapper>

      <PortfoliosGalleryWrapper caseId="portfolios-error" title="Portfolios — error">
        <ErrorState className="flex-1" title="Couldn't load portfolios" description="An unexpected error occurred. Try again." />
      </PortfoliosGalleryWrapper>

      <GalleryCase id="portfolios-denied" title="Portfolios — access denied">
        <NoPermissionState permission="build:portfolios:view" />
      </GalleryCase>

      <GalleryCase id="portfolio-detail-ready" title="Portfolio detail — populated">
        <PageWrapper title="Platform Modernisation" subtitle="Active · On track · 4 projects">
          <PmPageShell>
            <PmSection index={0} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
              <h2 className="text-sm font-semibold">Linked projects</h2>
              <ul aria-label="Linked projects" className="flex flex-col gap-2">
                <li className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm"><span className="font-medium">Auth service refactor</span></li>
                <li className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm"><span className="font-medium">Data pipeline v2</span></li>
              </ul>
            </PmSection>
          </PmPageShell>
        </PageWrapper>
      </GalleryCase>

      <ProgramsGalleryWrapper caseId="programs-ready" title="Programs — populated">
        <ProgramsReadyTable />
      </ProgramsGalleryWrapper>

      <ProgramsGalleryWrapper caseId="programs-loading" title="Programs — loading">
        <DataTableSkeleton mobileCards rows={8} headers={PROGRAM_TABLE_HEADERS} className="flex-1" />
      </ProgramsGalleryWrapper>

      <ProgramsGalleryWrapper caseId="programs-empty-true" title="Programs — true empty">
        <EmptyState className={PM_FILL_PANEL} illustrationPreset="projects" title="No programs yet" description="Create a program to coordinate related projects toward one outcome." action={{ label: "New program", onClick: NOOP }} />
      </ProgramsGalleryWrapper>

      <ProgramsGalleryWrapper caseId="programs-error" title="Programs — error">
        <ErrorState className="flex-1" title="Couldn't load programs" description="An unexpected error occurred. Try again." />
      </ProgramsGalleryWrapper>

      <GalleryCase id="programs-denied" title="Programs — access denied">
        <NoPermissionState permission="build:programs:view" />
      </GalleryCase>
    </>
  );
}
