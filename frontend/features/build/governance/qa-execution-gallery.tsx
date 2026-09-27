"use client";

import { useState } from "react";
import { Pencil, IndianRupee, TrendingUp } from "lucide-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import { Button } from "@/components/ui/button";
import type { TestCase, TestRunResult } from "@/types/projects";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import {
  GALLERY_STUB_ACCESS,
  GOVERNANCE_QA_ROWS,
  GOVERNANCE_QA_RUN_RESULTS,
} from "@/features/build/shared/build-list-fixtures";
import {
  buildTestCaseColumns,
  TestCaseMobileCard,
  TEST_CASE_TABLE_HEADERS,
} from "@/features/build/qa/test-case-columns";
import {
  GalleryCase,
  GalleryList,
  ONE_ACTION,
  TWO_ACTIONS,
  noop,
  GALLERY_STATIC_PAGINATION,
} from "@/features/build/shared/build-list-gallery-cases";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import { IncidentSlaPanel } from "@/features/build/incidents/incident-sla-panel";
import { buildResultColumns } from "@/features/build/qa/runs/result-columns";
import { ResultRow } from "@/features/build/qa/runs/result-row";

const MEMBER_NAMES: Record<string, string> = {
  user_priya: "Priya Nair",
  user_daniel: "Daniel Okafor",
};

type GalleryMemberRow = { userId: string; hours: number; cost: number };

const MEMBER_COST_ROWS: GalleryMemberRow[] = [
  { userId: "user_priya", hours: 120.5, cost: 240000 },
  { userId: "user_daniel", hours: 80.0, cost: 160000 },
];

const MEMBER_COST_COLUMNS: DataTableColumn<GalleryMemberRow>[] = [
  {
    key: "userId",
    header: "Member",
    cell: (row) => <span>{MEMBER_NAMES[row.userId] ?? row.userId}</span>,
  },
  {
    key: "hours",
    header: "Hours",
    className: "text-right w-[120px]",
    headerClassName: "text-right",
    cell: (row) => <span className="font-mono tabular-nums">{row.hours.toFixed(1)} hrs</span>,
  },
  {
    key: "cost",
    header: "Cost",
    className: "text-right w-[120px]",
    headerClassName: "text-right",
    cell: (row) => <span className="font-mono tabular-nums">₹{row.cost.toLocaleString("en-IN")}</span>,
  },
];

const RESULT_STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "not_run", label: "Not Run" },
  { value: "passed", label: "Passed" },
  { value: "failed", label: "Failed" },
  { value: "blocked", label: "Blocked" },
  { value: "skipped", label: "Skipped" },
];

const GALLERY_DETAIL_INCIDENT = {
  id: 301,
  orgId: "org_gallery",
  projectId: 1,
  incidentNumber: 301,
  title: "API timeout on checkout endpoint",
  description: null,
  severity: "critical" as const,
  status: "investigating" as const,
  impact: "Customers cannot complete purchases",
  ownerId: "user_priya",
  rootCause: null,
  customerComms: null,
  detectedAt: "2026-09-26T10:00:00.000Z",
  respondedAt: "2026-09-26T10:15:00.000Z",
  resolvedAt: null,
  responseDueAt: "2026-09-26T10:30:00.000Z",
  resolutionDueAt: "2026-09-26T14:00:00.000Z",
  linkedTicketId: null,
  releaseId: null,
  createdBy: null,
  createdAt: "2026-09-26T10:00:00.000Z",
  updatedAt: "2026-09-26T10:15:00.000Z",
  deletedAt: null,
};

function QaTestCasesTable() {
  const columns = buildTestCaseColumns({
    canManage: true,
    onEdit: noop,
    onDelete: noop,
  });

  function getRowKey(row: TestCase) {
    return row.id;
  }

  function renderMobileCard(row: TestCase) {
    return (
      <TestCaseMobileCard
        testCase={row}
        canManage
        onEdit={noop}
        onDelete={noop}
      />
    );
  }

  return (
    <BuildListSurface<TestCase>
      permission="build:qa:view"
      rows={GOVERNANCE_QA_ROWS}
      columns={columns}
      isLoading={false}
      isError={false}
      getRowKey={getRowKey}
      mobileCard={renderMobileCard}
      minWidth="600px"
      pagination={GALLERY_STATIC_PAGINATION}
      empty={
        <EmptyState
          className={CONTENT_FILL_PANEL}
          illustrationPreset="documents"
          title="No test cases"
        />
      }
    />
  );
}

function BudgetOverview() {
  function getRowKey(row: GalleryMemberRow) {
    return row.userId;
  }

  function renderMobileCard(row: GalleryMemberRow) {
    return (
      <BuildMobileCard
        title={MEMBER_NAMES[row.userId] ?? row.userId}
        meta={[
          { label: "Hours", value: `${row.hours.toFixed(1)} hrs` },
          { label: "Cost", value: `₹${row.cost.toLocaleString("en-IN")}` },
        ]}
      />
    );
  }

  return (
    <GalleryCase id="budget-overview" title="Budget · stat cards + member breakdown">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Project Budget</h2>
          <Button size="sm" variant="outline" type="button">
            <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Update Budget
          </Button>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          <StatCardGrid cols={3} stackOnMobile>
            <StatCard label="Planned" value="₹12,00,000" icon={IndianRupee} />
            <StatCard label="Actual" value="₹8,00,000" icon={TrendingUp} />
            <StatCard label="Remaining" value="₹4,00,000" icon={IndianRupee} tone="default" />
          </StatCardGrid>
          <DataTable
            data={MEMBER_COST_ROWS}
            columns={MEMBER_COST_COLUMNS}
            getRowKey={getRowKey}
            minWidth="400px"
            className={CONTENT_FILL_PANEL}
            mobileCard={renderMobileCard}
            pagination={GALLERY_STATIC_PAGINATION}
          />
        </div>
      </div>
    </GalleryCase>
  );
}

function IncidentDetailCase() {
  return (
    <GalleryCase id="incident-detail" title="Incident detail · severity + SLA panel">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              INC-{GALLERY_DETAIL_INCIDENT.incidentNumber} {GALLERY_DETAIL_INCIDENT.title}
            </h2>
          </div>
          <Button size="sm" variant="outline" type="button">
            <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Edit
          </Button>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          <div className="flex items-center gap-2">
            <span className="rounded border border-status-danger-rule bg-status-danger-surface px-1.5 py-0.5 text-xs font-semibold uppercase text-status-danger-ink-strong">
              {GALLERY_DETAIL_INCIDENT.severity}
            </span>
            <span className="rounded border border-category-orange-rule px-1.5 py-0.5 text-xs font-medium text-category-orange-ink">
              Investigating
            </span>
          </div>
          <IncidentSlaPanel incident={GALLERY_DETAIL_INCIDENT} />
        </div>
      </div>
    </GalleryCase>
  );
}

function QaRunExecutionCase() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filters = [
    {
      id: "status",
      label: "Status",
      active: statusFilter !== "all",
      control: (
        <BuildFilterSelect
          label="Status"
          value={statusFilter}
          onValueChange={setStatusFilter}
          options={RESULT_STATUS_OPTIONS}
        />
      ),
    },
  ];

  const columns = buildResultColumns({
    projectId: 1,
    canExecute: false,
    canCreateBug: false,
    onCreateBug: noop,
    onOpenNotes: noop,
  });

  function getRowKey(row: TestRunResult) {
    return row.id;
  }

  function renderMobileCard(row: TestRunResult) {
    return (
      <ResultRow
        result={row}
        projectId={1}
        canExecute={false}
        canCreateBug={false}
        onCreateBug={noop}
      />
    );
  }

  function handleClearAll() {
    setSearch("");
    setStatusFilter("all");
  }

  return (
    <GalleryCase id="qa-run-execution" title="QA run execution · result table + status filter">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border px-4 py-2">
          <BuildListToolbar
            search={{
              value: search,
              onValueChange: setSearch,
              placeholder: "Search test cases…",
              label: "Search test cases",
            }}
            filters={filters}
            onClearAll={handleClearAll}
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <BuildListSurface<(typeof GOVERNANCE_QA_RUN_RESULTS)[number]>
            permission="build:qa:view"
            rows={GOVERNANCE_QA_RUN_RESULTS}
            columns={columns}
            isLoading={false}
            isError={false}
            getRowKey={getRowKey}
            mobileCard={renderMobileCard}
            minWidth="640px"
            pagination={GALLERY_STATIC_PAGINATION}
            empty={
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="documents"
                title="No test results"
              />
            }
          />
        </div>
      </div>
    </GalleryCase>
  );
}

function ReportsTabsCase() {
  return (
    <GalleryCase id="reports-tabs" title="Reports · tab navigation + chart headings">
      <Tabs defaultValue="agile" className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          <TabsList>
            <TabsTrigger value="agile">Agile Reports</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
          </TabsList>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
          <TabsContent value="agile" className="mt-0 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-foreground">Velocity</h3>
            <div
              className="h-32 rounded-md border border-dashed border-border"
              role="img"
              aria-label="Velocity chart placeholder — live data not loaded in gallery"
            />
            <h3 className="text-sm font-semibold text-foreground">Burnup</h3>
            <div
              className="h-32 rounded-md border border-dashed border-border"
              role="img"
              aria-label="Burnup chart placeholder — live data not loaded in gallery"
            />
          </TabsContent>
          <TabsContent value="overview" className="mt-0">
            <p className="text-dense text-muted-foreground">Overview metrics</p>
          </TabsContent>
        </div>
      </Tabs>
    </GalleryCase>
  );
}

export function QaExecutionGallery() {
  const [queryClient] = useState(() => {
    const client = createAppQueryClient("qa-execution-gallery");
    client.setQueryData(platformCoreQueryKeys.access.me(), GALLERY_STUB_ACCESS);
    return client;
  });
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex flex-col gap-8 p-4">
        <header>
          <h1 className="text-lg font-semibold tracking-tight">
            QA execution &amp; project financials
          </h1>
          <p className="mt-1 text-label text-muted-foreground">
            Browser-verifiable layout facts for QA test case lists, run execution,
            incident SLA panels, budget overviews, and report tab navigation.
          </p>
        </header>

        <GalleryList
          caseId="qa-test-cases"
          title="QA test cases · suite + status filters"
          actions={TWO_ACTIONS}
          filterCount={2}
          body={<QaTestCasesTable />}
        />
        <GalleryList
          caseId="loading-qa"
          title="Loading — QA test cases"
          actions={ONE_ACTION}
          filterCount={2}
          body={
            <DataTableSkeleton
              mobileCards
              rows={8}
              headers={[...TEST_CASE_TABLE_HEADERS]}
              className="flex-1"
            />
          }
        />
        <BudgetOverview />
        <IncidentDetailCase />
        <QaRunExecutionCase />
        <ReportsTabsCase />
      </div>
    </QueryClientProvider>
  );
}
