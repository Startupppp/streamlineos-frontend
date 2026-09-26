"use client";

import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { Diamond, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared";
import { PM_FILL_PANEL, PmPageShell, PmSection } from "@/components/pm-chrome";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { MilestoneCard } from "./milestone-card";
import type { ProjectMilestone } from "@/hooks/api/build";
import {
  RELEASES_TABLE_HEADERS,
  buildReleasesColumns,
  ReleaseMobileCard,
} from "@/features/build/releases/releases-table-columns";
import type { Release } from "@/hooks/api/build/releases";

const MILESTONE_STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "ACHIEVED", label: "Achieved" },
  { value: "MISSED", label: "Missed" },
];

const RELEASE_STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "released", label: "Released" },
  { value: "archived", label: "Archived" },
];

const STUB_MILESTONES: ProjectMilestone[] = [
  {
    id: 1,
    projectId: 1,
    orgId: "org-1",
    name: "Alpha launch",
    description: "Internal alpha with core workflow complete",
    targetDate: "2027-03-15",
    status: "PENDING",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
    createdBy: "user-1",
  },
  {
    id: 2,
    projectId: 1,
    orgId: "org-1",
    name: "Beta rollout",
    description: null,
    targetDate: "2026-06-01",
    status: "ACHIEVED",
    createdAt: "2026-01-02T00:00:00Z",
    updatedAt: "2026-09-02T00:00:00Z",
    createdBy: "user-1",
  },
  {
    id: 3,
    projectId: 1,
    orgId: "org-1",
    name: "GA release",
    description: "General availability — all tier customers",
    targetDate: "2026-08-01",
    status: "MISSED",
    createdAt: "2026-01-03T00:00:00Z",
    updatedAt: "2026-09-03T00:00:00Z",
    createdBy: "user-2",
  },
  {
    id: 4,
    projectId: 1,
    orgId: "org-1",
    name: "Public launch blog post",
    description: null,
    targetDate: "2027-04-01",
    status: "PENDING",
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-09-10T00:00:00Z",
    createdBy: "user-2",
  },
  {
    id: 5,
    projectId: 1,
    orgId: "org-1",
    name: "Enterprise tier ready",
    description: "SSO, audit logs, advanced RBAC complete",
    targetDate: "2027-06-30",
    status: "PENDING",
    createdAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-09-15T00:00:00Z",
    createdBy: "user-1",
  },
];

const STUB_RELEASES: Release[] = [
  {
    id: 1,
    projectId: 1,
    name: "Initial release",
    version: "1.0.0",
    description: "First production release",
    status: "released",
    releaseDate: "2026-06-01",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
    ticketCount: 24,
  },
  {
    id: 2,
    projectId: 1,
    name: "Hotfix",
    version: "1.0.1",
    description: null,
    status: "released",
    releaseDate: "2026-06-15",
    createdAt: "2026-06-10T00:00:00Z",
    updatedAt: "2026-06-15T00:00:00Z",
    ticketCount: 3,
  },
  {
    id: 3,
    projectId: 1,
    name: "Feature drop",
    version: "1.1.0",
    description: "Cursor pagination, new filters, dark mode polish",
    status: "draft",
    releaseDate: null,
    createdAt: "2026-07-01T00:00:00Z",
    updatedAt: "2026-09-20T00:00:00Z",
    ticketCount: 11,
  },
  {
    id: 4,
    projectId: 1,
    name: "Legacy archive",
    version: "0.9.0",
    description: null,
    status: "archived",
    releaseDate: "2026-03-01",
    createdAt: "2025-12-01T00:00:00Z",
    updatedAt: "2026-03-01T00:00:00Z",
    ticketCount: 8,
  },
];

const STUB_NOOP = () => undefined;

function GalleryCase({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section data-case={id} aria-label={title}>
      <h2 className="mb-1 text-sm font-semibold text-foreground">{title}</h2>
      <div
        data-case-frame={id}
        className="flex h-[34rem] w-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-background"
      >
        {children}
      </div>
    </section>
  );
}

function MilestoneListToolbar() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const handleClearAll = useCallback(() => {
    setSearch("");
    setStatus("all");
    setDateRange({ from: "", to: "" });
  }, []);

  return (
    <BuildListToolbar
      search={{
        value: search,
        onValueChange: setSearch,
        placeholder: "Search milestones…",
        label: "Search milestones",
      }}
      filters={[
        {
          id: "status",
          label: "Status",
          active: status !== "all",
          control: (
            <BuildFilterSelect
              label="Status"
              value={status}
              onValueChange={setStatus}
              options={MILESTONE_STATUS_OPTIONS}
            />
          ),
        },
        {
          id: "date-range",
          label: "Date range",
          active: !!dateRange.from || !!dateRange.to,
          control: (
            <DateRangePicker
              from={dateRange.from || undefined}
              to={dateRange.to || undefined}
              onChange={setDateRange}
              placeholder="Filter by target date…"
            />
          ),
        },
      ]}
      onClearAll={handleClearAll}
    />
  );
}

function MilestoneGalleryWrapper({
  caseId,
  title,
  children,
}: {
  caseId: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <GalleryCase id={caseId} title={title}>
      <PageWrapper
        title="Milestones"
        subtitle="Key checkpoints and target dates for this project"
        actions={
          <BuildHeaderActions
            actions={[{ id: "new", label: "New Milestone", icon: Diamond, primary: true }]}
          />
        }
        filters={<MilestoneListToolbar />}
      >
        <PmPageShell>
          <PmSection index={0} className="shrink-0">
            <StatCardGrid cols={4}>
              <StatCard label="This page" value={5} icon={Diamond} tone="default" index={0} />
              <StatCard label="Achieved" value={1} icon={CheckCircle2} tone="emerald" index={1} />
              <StatCard label="Pending" value={3} icon={Clock} tone="amber" index={2} />
              <StatCard label="Overdue" value={1} icon={AlertCircle} tone="red" index={3} />
            </StatCardGrid>
          </PmSection>
          <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
            {children}
          </PmSection>
        </PmPageShell>
      </PageWrapper>
    </GalleryCase>
  );
}

function MilestoneListBody() {
  return (
    <ul className="space-y-2.5 overflow-y-auto p-4" aria-label="Project milestones">
      {STUB_MILESTONES.map((m) => (
        <MilestoneCard key={m.id} milestone={m} onEdit={STUB_NOOP} onDelete={STUB_NOOP} />
      ))}
    </ul>
  );
}

function ReleaseListToolbar() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const handleClearAll = useCallback(() => {
    setSearch("");
    setStatus("all");
    setDateRange({ from: "", to: "" });
  }, []);

  return (
    <BuildListToolbar
      search={{
        value: search,
        onValueChange: setSearch,
        placeholder: "Search releases…",
        label: "Search releases",
      }}
      filters={[
        {
          id: "status",
          label: "Status",
          active: status !== "all",
          control: (
            <BuildFilterSelect
              label="Status"
              value={status}
              onValueChange={setStatus}
              options={RELEASE_STATUS_OPTIONS}
            />
          ),
        },
        {
          id: "date-range",
          label: "Date range",
          active: !!dateRange.from || !!dateRange.to,
          control: (
            <DateRangePicker
              from={dateRange.from || undefined}
              to={dateRange.to || undefined}
              onChange={setDateRange}
              placeholder="Filter by release date…"
            />
          ),
        },
      ]}
      onClearAll={handleClearAll}
    />
  );
}

function ReleaseGalleryWrapper({
  caseId,
  title,
  children,
}: {
  caseId: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <GalleryCase id={caseId} title={title}>
      <PageWrapper
        title="Releases"
        subtitle="Track versions and shipped features"
        actions={
          <BuildHeaderActions
            actions={[{ id: "new", label: "New Release", icon: Plus, primary: true }]}
          />
        }
        filters={<ReleaseListToolbar />}
      >
        <PmPageShell>
          <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
            {children}
          </PmSection>
        </PmPageShell>
      </PageWrapper>
    </GalleryCase>
  );
}

function ReleasesReadyTable() {
  const columns = buildReleasesColumns({
    canManage: true,
    onEdit: STUB_NOOP,
    onDelete: STUB_NOOP,
  });

  const renderMobileCard = useCallback(
    (row: Release) => (
      <ReleaseMobileCard
        release={row}
        canManage
        onEdit={STUB_NOOP}
        onDelete={STUB_NOOP}
      />
    ),
    [],
  );

  return (
    <DataTable
      data={STUB_RELEASES}
      columns={columns}
      getRowKey={(r) => r.id}
      mobileCard={renderMobileCard}
      className={PM_FILL_PANEL}
      pagination={{
        mode: "cursor",
        pageSize: 25,
        hasMore: false,
        hasPrevious: false,
        onNext: STUB_NOOP,
        onPrevious: STUB_NOOP,
      }}
    />
  );
}

export function PlanningSurfacesGallery() {
  return (
    <div className="flex flex-col gap-8 p-4">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Planning surfaces</h1>
        <p className="mt-1 text-label text-muted-foreground">
          Every state the Milestones and Releases pages can reach, rendered from
          the real page components.
        </p>
      </header>

      <MilestoneGalleryWrapper caseId="milestones-ready" title="Milestones — populated">
        <MilestoneListBody />
      </MilestoneGalleryWrapper>

      <MilestoneGalleryWrapper caseId="milestones-empty-true" title="Milestones — true empty">
        <EmptyState
          className={PM_FILL_PANEL}
          illustrationPreset="projects"
          title="No milestones yet"
          description="Add milestones to track key checkpoints and target dates."
          action={{ label: "Add Milestone", onClick: STUB_NOOP }}
        />
      </MilestoneGalleryWrapper>

      <MilestoneGalleryWrapper caseId="milestones-empty-filtered" title="Milestones — filtered empty">
        <EmptyState
          className={PM_FILL_PANEL}
          illustrationPreset="projects"
          title="No milestones yet"
          filtersActive
          onClearFilters={STUB_NOOP}
        />
      </MilestoneGalleryWrapper>

      <MilestoneGalleryWrapper caseId="milestones-error" title="Milestones — error">
        <ErrorState
          className="flex-1"
          title="Couldn't load milestones"
          description="An unexpected error occurred. Try again."
        />
      </MilestoneGalleryWrapper>

      <GalleryCase id="milestones-denied" title="Milestones — access denied">
        <NoPermissionState permission="build:view" />
      </GalleryCase>

      <ReleaseGalleryWrapper caseId="releases-ready" title="Releases — populated">
        <ReleasesReadyTable />
      </ReleaseGalleryWrapper>

      <ReleaseGalleryWrapper caseId="releases-loading" title="Releases — loading">
        <DataTableSkeleton
          mobileCards
          rows={8}
          headers={RELEASES_TABLE_HEADERS}
          className="flex-1"
        />
      </ReleaseGalleryWrapper>

      <ReleaseGalleryWrapper caseId="releases-empty-true" title="Releases — true empty">
        <EmptyState
          illustrationPreset="projects"
          title="No releases yet"
          description="Create your first release to track shipped features and versions."
          action={{ label: "New Release", onClick: STUB_NOOP }}
          className={PM_FILL_PANEL}
        />
      </ReleaseGalleryWrapper>

      <ReleaseGalleryWrapper caseId="releases-empty-filtered" title="Releases — filtered empty">
        <EmptyState
          illustrationPreset="projects"
          title="No releases yet"
          filtersActive
          onClearFilters={STUB_NOOP}
          className={PM_FILL_PANEL}
        />
      </ReleaseGalleryWrapper>

      <ReleaseGalleryWrapper caseId="releases-error" title="Releases — error">
        <ErrorState
          className="flex-1"
          title="We could not load your releases"
          description="An unexpected error occurred. Try again."
        />
      </ReleaseGalleryWrapper>

      <GalleryCase id="releases-denied" title="Releases — access denied">
        <NoPermissionState permission="build:view" />
      </GalleryCase>
    </div>
  );
}
