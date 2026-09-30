"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Download, Plus, Upload } from "lucide-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import {
  PmPageShell,
  PmSection,
  CONTENT_FILL_PANEL,
} from "@/components/pm-chrome";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { BuildListSurface } from "./build-list-surface";
import { GALLERY_STUB_ACCESS } from "./build-list-fixtures";
import { Button } from "@/components/ui/button";
import { BuildHeaderActions } from "./build-header-actions";
import type { BuildHeaderAction } from "./build-header-actions-plan";
import { BuildListToolbar } from "./build-list-toolbar";
import type { BuildToolbarFilter } from "./build-list-toolbar-layout";
import { BuildFilterSelect } from "./build-filter-select";
import { BuildMobileCard } from "./build-mobile-card";

export interface GalleryRow {
  id: number;
  key: string;
  name: string;
  status: string;
  owner: { firstName: string; lastName: string };
  progress: number;
  target: string;
}

export const ROWS: GalleryRow[] = Array.from({ length: 14 }, (_, index) => ({
  id: index + 1,
  key: `PRJ-${100 + index}`,
  name: `Atlas migration workstream ${index + 1}`,
  status:
    index % 3 === 0 ? "Active" : index % 3 === 1 ? "On hold" : "Completed",
  owner:
    index % 2 === 0
      ? { firstName: "Priya", lastName: "Nair" }
      : { firstName: "Daniel", lastName: "Okafor" },
  progress: (index * 7) % 100,
  target: `2026-1${index % 2}-0${(index % 8) + 1}`,
}));

export const GALLERY_HEADERS = [
  "Key",
  "Name",
  "Status",
  "Owner",
  "Progress",
  "Target",
] as const;

export const COLUMNS: DataTableColumn<GalleryRow>[] = [
  {
    key: "key",
    header: "Key",
    cell: (row) => <span className="font-mono tabular-nums">{row.key}</span>,
  },
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
    cell: (row) => (
      <span className="font-mono tabular-nums">{row.progress}%</span>
    ),
  },
  { key: "target", header: "Target", cell: (row) => row.target },
];

export const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On hold" },
];
export const HEALTH_OPTIONS = [
  { value: "all", label: "All health" },
  { value: "at_risk", label: "At risk" },
];
export const LEAD_OPTIONS = [
  { value: "all", label: "All leads" },
  { value: "priya", label: "Priya Nair" },
];

export function getRowKey(row: GalleryRow) {
  return row.id;
}

export function renderMobileCard(row: GalleryRow) {
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

export function noop() {
  return undefined;
}

export const GALLERY_STATIC_PAGINATION = {
  mode: "cursor",
  pageSize: 50,
  pageNumber: 2,
  hasMore: true,
  hasPrevious: true,
  onNext: noop,
  onPrevious: noop,
} as const;

export function GalleryCase({
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
      <h2 className="mb-1 text-sm font-medium text-foreground">{title}</h2>
      <div
        data-case-frame={id}
        className="flex h-[32rem] w-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-background"
      >
        {children}
      </div>
    </section>
  );
}

export function useGalleryFilters(count: number): BuildToolbarFilter[] {
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

export const ONE_ACTION: BuildHeaderAction[] = [
  { id: "create", label: "New project", icon: Plus, primary: true },
];
export const TWO_ACTIONS: BuildHeaderAction[] = [
  { id: "resume", label: "Resume project", href: "#resume" },
  ...ONE_ACTION,
];
export const FOUR_ACTIONS: BuildHeaderAction[] = [
  { id: "import", label: "Import", icon: Upload },
  { id: "export", label: "Export", icon: Download },
  { id: "archive", label: "Archive" },
  ...ONE_ACTION,
];

export function GalleryList({
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

function ReadyTableInner() {
  function handleNext() {
    return undefined;
  }
  function handlePrevious() {
    return undefined;
  }
  return (
    <BuildListSurface<GalleryRow>
      permission="build:view"
      rows={ROWS}
      columns={COLUMNS}
      isLoading={false}
      isError={false}
      getRowKey={getRowKey}
      mobileCard={renderMobileCard}
      minWidth="780px"
      pagination={{
        mode: "cursor",
        pageSize: 20,
        pageNumber: 2,
        hasMore: true,
        hasPrevious: true,
        onNext: handleNext,
        onPrevious: handlePrevious,
      }}
      empty={
        <EmptyState
          className={CONTENT_FILL_PANEL}
          illustrationPreset="projects"
          title="No projects yet"
        />
      }
    />
  );
}

export function ReadyTable() {
  const [queryClient] = useState(() => {
    const client = createAppQueryClient("build-list-gallery-ready");
    client.setQueryData(platformCoreQueryKeys.access.me(), GALLERY_STUB_ACCESS);
    return client;
  });
  return (
    <QueryClientProvider client={queryClient}>
      <ReadyTableInner />
    </QueryClientProvider>
  );
}
