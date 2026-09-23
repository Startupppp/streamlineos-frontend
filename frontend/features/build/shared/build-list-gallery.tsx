"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Download, Plus, Upload } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PmPageShell, PmSection, PM_FILL_PANEL } from "@/components/pm-chrome";
import { Button } from "@/components/ui/button";
import { BuildHeaderActions } from "./build-header-actions";
import type { BuildHeaderAction } from "./build-header-actions-plan";
import { BuildListToolbar } from "./build-list-toolbar";
import type { BuildToolbarFilter } from "./build-list-toolbar-layout";
import { BuildFilterSelect } from "./build-filter-select";
import { BuildMobileCard } from "./build-mobile-card";

interface GalleryRow {
  id: number;
  key: string;
  name: string;
  status: string;
  owner: { firstName: string; lastName: string };
  progress: number;
  target: string;
}

const ROWS: GalleryRow[] = Array.from({ length: 14 }, (_, index) => ({
  id: index + 1,
  key: `PRJ-${100 + index}`,
  name: `Atlas migration workstream ${index + 1}`,
  status: index % 3 === 0 ? "Active" : index % 3 === 1 ? "On hold" : "Completed",
  owner:
    index % 2 === 0
      ? { firstName: "Priya", lastName: "Nair" }
      : { firstName: "Daniel", lastName: "Okafor" },
  progress: (index * 7) % 100,
  target: `2026-1${index % 2}-0${(index % 8) + 1}`,
}));

const GALLERY_HEADERS = [
  "Key",
  "Name",
  "Status",
  "Owner",
  "Progress",
  "Target",
] as const;

const COLUMNS: DataTableColumn<GalleryRow>[] = [
  { key: "key", header: "Key", cell: (row) => <span className="font-mono tabular-nums">{row.key}</span> },
  { key: "name", header: "Name", cell: (row) => row.name },
  { key: "status", header: "Status", cell: (row) => row.status },
  {
    key: "owner",
    header: "Owner",
    cell: (row) => `${row.owner.firstName} ${row.owner.lastName}`,
  },
  {
    key: "progress",
    header: "Progress",
    cell: (row) => <span className="font-mono tabular-nums">{row.progress}%</span>,
  },
  { key: "target", header: "Target", cell: (row) => row.target },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On hold" },
];
const HEALTH_OPTIONS = [
  { value: "all", label: "All health" },
  { value: "at_risk", label: "At risk" },
];
const LEAD_OPTIONS = [
  { value: "all", label: "All leads" },
  { value: "priya", label: "Priya Nair" },
];

function getRowKey(row: GalleryRow) {
  return row.id;
}

function renderMobileCard(row: GalleryRow) {
  return (
    <BuildMobileCard
      eyebrow={row.key}
      title={row.name}
      status={<span className="text-label">{row.status}</span>}
      person={{ user: row.owner, role: "Owner" }}
      meta={[
        { label: "Progress", value: `${row.progress}%` },
        { label: "Target", value: row.target },
      ]}
      actions={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Actions for ${row.name}`}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
        </Button>
      }
    />
  );
}

function GalleryCase({
  id,
  title,
  children,
  navActive = false,
}: {
  id: string;
  title: string;
  children: ReactNode;
  navActive?: boolean;
}) {
  return (
    <section
      data-case={id}
      aria-label={title}
      className={navActive ? "mobile-nav-active" : undefined}
    >
      <h2 className="mb-1 text-sm font-semibold text-foreground">{title}</h2>
      <div
        data-case-frame={id}
        className="flex h-[32rem] w-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-background"
      >
        {children}
      </div>
    </section>
  );
}

function useGalleryFilters(count: number): BuildToolbarFilter[] {
  const [status, setStatus] = useState("all");
  const [health, setHealth] = useState("all");
  const [lead, setLead] = useState("all");

  const all: BuildToolbarFilter[] = [
    {
      id: "status",
      label: "Status",
      active: status !== "all",
      control: (
        <BuildFilterSelect
          label="Status"
          value={status}
          onValueChange={setStatus}
          options={STATUS_OPTIONS}
        />
      ),
    },
    {
      id: "health",
      label: "Health",
      active: health !== "all",
      control: (
        <BuildFilterSelect
          label="Health"
          value={health}
          onValueChange={setHealth}
          options={HEALTH_OPTIONS}
        />
      ),
    },
    {
      id: "lead",
      label: "Lead",
      active: lead !== "all",
      control: (
        <BuildFilterSelect
          label="Lead"
          value={lead}
          onValueChange={setLead}
          options={LEAD_OPTIONS}
        />
      ),
    },
  ];
  return all.slice(0, count);
}

const ONE_ACTION: BuildHeaderAction[] = [
  { id: "create", label: "New project", icon: Plus, primary: true },
];
const TWO_ACTIONS: BuildHeaderAction[] = [
  { id: "resume", label: "Resume project", href: "#resume" },
  ...ONE_ACTION,
];
const FOUR_ACTIONS: BuildHeaderAction[] = [
  { id: "import", label: "Import", icon: Upload },
  { id: "export", label: "Export", icon: Download },
  { id: "archive", label: "Archive" },
  ...ONE_ACTION,
];

function GalleryList({
  caseId,
  title,
  actions,
  filterCount,
  body,
  navActive,
}: {
  caseId: string;
  title: string;
  actions: BuildHeaderAction[];
  filterCount: number;
  body: ReactNode;
  navActive?: boolean;
}) {
  const filters = useGalleryFilters(filterCount);
  const [search, setSearch] = useState("");
  const handleClearAll = useCallback(() => setSearch(""), []);

  return (
    <GalleryCase id={caseId} title={title} navActive={navActive}>
      <PageWrapper
        title="All projects"
        subtitle="Browse and manage every project in your organization"
        actions={<BuildHeaderActions actions={actions} />}
        filters={
          <BuildListToolbar
            search={{
              value: search,
              onValueChange: setSearch,
              placeholder: "Search projects…",
              label: "Search projects",
            }}
            filters={filters}
            onClearAll={handleClearAll}
          />
        }
      >
        <PmPageShell>
          <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
            {body}
          </PmSection>
        </PmPageShell>
      </PageWrapper>
    </GalleryCase>
  );
}

function ReadyTable() {
  return (
    <DataTable
      data={ROWS}
      columns={COLUMNS}
      getRowKey={getRowKey}
      minWidth="780px"
      mobileCard={renderMobileCard}
      className={PM_FILL_PANEL}
      pagination={{
        mode: "cursor",
        pageSize: 20,
        hasMore: true,
        hasPrevious: true,
        onNext: () => undefined,
        onPrevious: () => undefined,
      }}
    />
  );
}

export function BuildListGallery() {
  return (
    <div className="flex flex-col gap-8 p-4">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">
          Build list surfaces
        </h1>
        <p className="mt-1 text-label text-muted-foreground">
          Every state and responsive contract the Build list system promises,
          rendered from the shared components themselves.
        </p>
      </header>

      <GalleryList
        caseId="one-action-one-filter"
        title="One action · one filter"
        actions={ONE_ACTION}
        filterCount={1}
        body={<ReadyTable />}
      />
      <GalleryList
        caseId="two-actions-two-filters"
        title="Two actions · two filters"
        actions={TWO_ACTIONS}
        filterCount={2}
        body={<ReadyTable />}
      />
      <GalleryList
        caseId="four-actions-three-filters"
        title="Four actions · three filters"
        actions={FOUR_ACTIONS}
        filterCount={3}
        body={<ReadyTable />}
      />
      <GalleryList
        caseId="loading"
        title="Loading"
        actions={ONE_ACTION}
        filterCount={3}
        body={
          <DataTableSkeleton
            rows={12}
            headers={GALLERY_HEADERS}
            className="flex-1"
          />
        }
      />
      <GalleryList
        caseId="empty-true"
        title="True empty"
        actions={ONE_ACTION}
        filterCount={3}
        body={
          <EmptyState
            className={PM_FILL_PANEL}
            illustrationPreset="projects"
            title="No projects yet"
            description="Create a project to start planning work."
            action={{ label: "New project" }}
          />
        }
      />
      <GalleryList
        caseId="empty-filtered"
        title="Filtered empty"
        actions={ONE_ACTION}
        filterCount={3}
        body={
          <EmptyState
            className={PM_FILL_PANEL}
            illustrationPreset="projects"
            title="No projects yet"
            action={{ label: "New project" }}
            filtersActive
          />
        }
      />
      <GalleryList
        caseId="error"
        title="Error"
        actions={ONE_ACTION}
        filterCount={3}
        body={
          <ErrorState
            title="We could not load your projects"
            className="flex-1"
          />
        }
      />
      <GalleryList
        caseId="mobile-nav-clearance"
        title="Mobile bottom nav mounted"
        actions={TWO_ACTIONS}
        filterCount={3}
        body={<ReadyTable />}
        navActive
      />
    </div>
  );
}
