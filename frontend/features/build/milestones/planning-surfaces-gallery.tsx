"use client";

import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { Diamond, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { QueryClientProvider } from "@tanstack/react-query";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import { GalleryCase } from "@/features/build/shared/build-list-gallery-cases";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { GALLERY_STUB_ACCESS } from "@/features/build/shared/build-list-fixtures";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared";
import { CONTENT_FILL_PANEL, PmPageShell, PmSection } from "@/components/pm-chrome";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { MilestoneCard } from "./milestone-card";
import {
  RELEASES_TABLE_HEADERS,
  buildReleasesColumns,
  ReleaseMobileCard,
} from "@/features/build/releases/releases-table-columns";
import type { Release } from "@/hooks/api/build/releases";
import {
  MILESTONE_STATUS_OPTIONS,
  RELEASE_STATUS_OPTIONS,
  STUB_MILESTONES,
  STUB_NOOP,
  STUB_RELEASES,
} from "./planning-surfaces-fixtures";

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

  function getRowKey(row: Release) { return row.id; }

  return (
    <BuildListSurface<Release>
      permission="build:view"
      rows={STUB_RELEASES}
      columns={columns}
      isLoading={false}
      isError={false}
      getRowKey={getRowKey}
      mobileCard={renderMobileCard}
      pagination={{ mode: "cursor", pageSize: 25, hasMore: false, hasPrevious: false, onNext: STUB_NOOP, onPrevious: STUB_NOOP }}
      empty={<EmptyState className={CONTENT_FILL_PANEL} illustrationPreset="projects" title="No releases yet" />}
    />
  );
}

export function PlanningSurfacesGallery() {
  const [queryClient] = useState(() => {
    const client = createAppQueryClient("planning-surfaces-gallery");
    client.setQueryData(platformCoreQueryKeys.access.me(), GALLERY_STUB_ACCESS);
    return client;
  });
  return (
    <QueryClientProvider client={queryClient}>
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
          className={CONTENT_FILL_PANEL}
          illustrationPreset="projects"
          title="No milestones yet"
          description="Add milestones to track key checkpoints and target dates."
          action={{ label: "Add Milestone", onClick: STUB_NOOP }}
        />
      </MilestoneGalleryWrapper>

      <MilestoneGalleryWrapper caseId="milestones-empty-filtered" title="Milestones — filtered empty">
        <EmptyState
          className={CONTENT_FILL_PANEL}
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
          className={CONTENT_FILL_PANEL}
        />
      </ReleaseGalleryWrapper>

      <ReleaseGalleryWrapper caseId="releases-empty-filtered" title="Releases — filtered empty">
        <EmptyState
          illustrationPreset="projects"
          title="No releases yet"
          filtersActive
          onClearFilters={STUB_NOOP}
          className={CONTENT_FILL_PANEL}
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
    </QueryClientProvider>
  );
}
