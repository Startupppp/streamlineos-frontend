"use client";

import { useState, useEffect } from "react";
import { X, Pencil, IndianRupee, TrendingUp } from "lucide-react";
import { DataTableSkeleton, DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PM_FILL_PANEL } from "@/components/pm-chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { NamedUser } from "@/lib/person-display";
import type { Risk, TestCase, Decision, Approval, ApprovalStatus, TestRunResult, TestResultStatus, TestCasePriority } from "@/types/projects";
import type { Incident } from "@/hooks/api/build/incidents-schema";
import type { OrgMember } from "@/hooks/api/organization";
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
} from "@/features/build/shared/build-list-gallery-cases";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import { IncidentSlaPanel } from "@/features/build/incidents/incident-sla-panel";
import { buildResultColumns } from "@/features/build/qa/runs/result-columns";
import { ResultRow } from "@/features/build/qa/runs/result-row";
import { ApprovalStatusBadge, entityTypeLabel } from "@/features/build/approvals/approval-status-badge";
import {
  buildRiskColumns,
  RiskMobileCard,
  RISK_TABLE_HEADERS,
} from "./risks-table-columns";
import {
  buildDecisionColumns,
  DecisionMobileCard,
  DECISION_TABLE_HEADERS,
} from "./decisions-table-columns";
import {
  buildIncidentsColumns,
  IncidentMobileCard,
  INCIDENTS_TABLE_HEADERS,
} from "@/features/build/incidents/incidents-table-columns";
import {
  useApprovalsColumns,
  APPROVALS_TABLE_HEADERS,
} from "@/features/build/approvals/use-approvals-columns";

const OWNERS: Record<string, NamedUser> = {
  user_priya: { firstName: "Priya", lastName: "Nair" },
  user_daniel: { firstName: "Daniel", lastName: "Okafor" },
};

const RISK_LEVELS = ["low", "medium", "high"] as const;
const RISK_STATUSES = [
  "open",
  "mitigating",
  "monitoring",
  "accepted",
  "closed",
] as const;

const RISK_ROWS: Risk[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  orgId: "org_gallery",
  projectId: 1,
  riskNumber: 100 + i,
  title: `Risk ${i + 1}: dependency on external vendor ${i + 1}`,
  description: null,
  probability: RISK_LEVELS[i % RISK_LEVELS.length],
  impact: RISK_LEVELS[(i + 1) % RISK_LEVELS.length],
  status: RISK_STATUSES[i % RISK_STATUSES.length],
  ownerId: i % 2 === 0 ? "user_priya" : "user_daniel",
  mitigation: null,
  linkedTicketId: null,
  createdBy: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  deletedAt: null,
}));

const TEST_CASE_PRIORITIES = ["low", "medium", "high"] as const;
const AUTOMATION_STATUSES = ["manual", "automated", "planned"] as const;
const COMPONENTS = ["Checkout", "Reporting", "Auth", null] as const;

const QA_ROWS: TestCase[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  orgId: "org_gallery",
  projectId: 1,
  suiteId: null,
  caseNumber: 200 + i,
  title: `Test case ${i + 1}: verify ${["login", "checkout", "report", "filter"][i % 4]} flow`,
  preconditions: null,
  steps: null,
  expectedResult: null,
  priority: TEST_CASE_PRIORITIES[i % TEST_CASE_PRIORITIES.length],
  component: COMPONENTS[i % COMPONENTS.length],
  linkedTicketId: null,
  automationStatus: AUTOMATION_STATUSES[i % AUTOMATION_STATUSES.length],
  createdBy: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  deletedAt: null,
}));

const INCIDENT_SEVERITIES = ["critical", "high", "medium", "low"] as const;
const INCIDENT_STATUSES = [
  "detected",
  "investigating",
  "mitigating",
  "resolved",
  "postmortem",
  "closed",
] as const;

const INCIDENT_MEMBERS: OrgMember[] = [
  {
    membershipId: 1,
    userId: "user_priya",
    role: "MEMBER",
    joinedAt: "2026-01-01T00:00:00.000Z",
    name: "Priya Nair",
    email: "priya@example.com",
    image: null,
    totpEnabled: false,
  },
  {
    membershipId: 2,
    userId: "user_daniel",
    role: "MEMBER",
    joinedAt: "2026-01-01T00:00:00.000Z",
    name: "Daniel Okafor",
    email: "daniel@example.com",
    image: null,
    totpEnabled: false,
  },
];

const INCIDENT_ROWS: Incident[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  orgId: "org_gallery",
  projectId: 1,
  incidentNumber: 300 + i,
  title: `Incident ${i + 1}: ${["API timeout", "DB connection pool exhausted", "CDN outage", "Auth service down"][i % 4]}`,
  description: null,
  severity: INCIDENT_SEVERITIES[i % INCIDENT_SEVERITIES.length],
  status: INCIDENT_STATUSES[i % INCIDENT_STATUSES.length],
  impact: null,
  ownerId: i % 2 === 0 ? "user_priya" : "user_daniel",
  rootCause: null,
  customerComms: null,
  detectedAt: "2026-01-01T00:00:00.000Z",
  respondedAt: null,
  resolvedAt: null,
  responseDueAt: null,
  resolutionDueAt: null,
  linkedTicketId: null,
  releaseId: null,
  createdBy: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  deletedAt: null,
}));

const DECISION_STATUSES = ["proposed", "accepted", "superseded", "revisit"] as const;

const DECISION_ROWS: Decision[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  orgId: "org_gallery",
  projectId: 1,
  decisionNumber: 400 + i,
  title: `Decision ${i + 1}: ${["Use PostgreSQL for main DB", "Adopt microservices", "Switch to Next.js", "Use Redis for caching"][i % 4]}`,
  context: null,
  decision: null,
  optionsConsidered: null,
  status: DECISION_STATUSES[i % DECISION_STATUSES.length],
  ownerId: i % 2 === 0 ? "user_priya" : "user_daniel",
  decidedAt: "2026-01-01T00:00:00.000Z",
  revisitAt: null,
  linkedTicketId: null,
  createdBy: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  deletedAt: null,
}));

const APPROVAL_ENTITY_TYPES = ["task", "milestone", "release", "budget"] as const;
const APPROVAL_STATUSES = ["requested", "pending", "approved", "rejected", "escalated"] as const;

const APPROVAL_ROWS: Approval[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  orgId: "org_gallery",
  projectId: 1,
  entityType: APPROVAL_ENTITY_TYPES[i % APPROVAL_ENTITY_TYPES.length],
  entityId: i + 1,
  title: `Approval ${i + 1}: ${["Deploy v2.0 to production", "Milestone sign-off", "Budget increase request", "Release gate"][i % 4]}`,
  reason: null,
  requestedById: i % 2 === 0 ? "user_priya" : "user_daniel",
  approverMembershipId: null,
  status: APPROVAL_STATUSES[i % APPROVAL_STATUSES.length],
  level: (i % 3) + 1,
  dueAt: i % 2 === 0 ? "2026-02-01T00:00:00.000Z" : null,
  decisionComment: null,
  decidedAt: null,
  createdBy: null,
  deletedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}));

function ownerOf(userId: string | null): NamedUser | null {
  return userId ? (OWNERS[userId] ?? null) : null;
}

function memberName(userId: string | null): string {
  const owner = ownerOf(userId);
  if (!owner) return "Unassigned";
  return `${owner.firstName ?? ""} ${owner.lastName ?? ""}`.trim();
}

function noop() {
  return undefined;
}

const APPROVAL_STATUS_VALUES: ApprovalStatus[] = [
  "requested", "pending", "approved", "rejected", "changes_requested", "escalated", "cancelled",
];

function toApprovalStatus(s: string): ApprovalStatus {
  return APPROVAL_STATUS_VALUES.find((v) => v === s) ?? "pending";
}

const STATIC_PAGINATION = {
  mode: "cursor",
  pageSize: 50,
  hasMore: true,
  hasPrevious: true,
  onNext: noop,
  onPrevious: noop,
} as const;

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

const RUN_RESULT_STATUSES: TestResultStatus[] = ["not_run", "passed", "failed", "not_run", "passed"];
const RUN_RESULT_PRIORITIES: TestCasePriority[] = ["high", "medium", "low", "medium", "high"];

const QA_RUN_RESULTS: TestRunResult[] = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1,
  runId: 1,
  testCaseId: i + 1,
  status: RUN_RESULT_STATUSES[i % RUN_RESULT_STATUSES.length] ?? "not_run",
  notes: null,
  executedBy: null,
  executedAt: null,
  linkedWorkItemId: null,
  testCase: {
    caseNumber: 200 + i,
    title: `Test case ${i + 1}: verify flow ${i + 1}`,
    priority: RUN_RESULT_PRIORITIES[i % RUN_RESULT_PRIORITIES.length] ?? "medium",
  },
}));

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

function RisksTable() {
  const columns = buildRiskColumns({
    canManage: true,
    memberName,
    ownerOf,
    onEdit: noop,
    onDelete: noop,
  });

  function getRowKey(row: Risk) {
    return row.id;
  }

  function renderMobileCard(row: Risk) {
    return (
      <RiskMobileCard
        risk={row}
        canManage
        ownerOf={ownerOf}
        onEdit={noop}
        onDelete={noop}
      />
    );
  }

  return (
    <DataTable
      data={RISK_ROWS}
      columns={columns}
      getRowKey={getRowKey}
      minWidth="720px"
      className={PM_FILL_PANEL}
      mobileCard={renderMobileCard}
      pagination={STATIC_PAGINATION}
    />
  );
}

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
    <DataTable
      data={QA_ROWS}
      columns={columns}
      getRowKey={getRowKey}
      minWidth="600px"
      className={PM_FILL_PANEL}
      mobileCard={renderMobileCard}
      pagination={STATIC_PAGINATION}
    />
  );
}

function IncidentsTable() {
  const columns = buildIncidentsColumns({
    canManage: true,
    members: INCIDENT_MEMBERS,
    projectId: 1,
    onEdit: noop,
    onDelete: noop,
  });

  function getRowKey(row: Incident) {
    return row.id;
  }

  function renderMobileCard(row: Incident) {
    return (
      <IncidentMobileCard
        incident={row}
        canManage
        members={INCIDENT_MEMBERS}
        onEdit={noop}
        onDelete={noop}
      />
    );
  }

  return (
    <DataTable
      data={INCIDENT_ROWS}
      columns={columns}
      getRowKey={getRowKey}
      minWidth="760px"
      className={PM_FILL_PANEL}
      mobileCard={renderMobileCard}
      pagination={STATIC_PAGINATION}
    />
  );
}

function DecisionsTable() {
  const columns = buildDecisionColumns({
    canManage: true,
    memberName,
    ownerOf,
    onEdit: noop,
    onDelete: noop,
  });

  function getRowKey(row: Decision) {
    return row.id;
  }

  function renderMobileCard(row: Decision) {
    return (
      <DecisionMobileCard
        decision={row}
        canManage
        ownerOf={ownerOf}
        onEdit={noop}
        onDelete={noop}
      />
    );
  }

  return (
    <DataTable
      data={DECISION_ROWS}
      columns={columns}
      getRowKey={getRowKey}
      minWidth="720px"
      className={PM_FILL_PANEL}
      mobileCard={renderMobileCard}
      pagination={STATIC_PAGINATION}
    />
  );
}

function ApprovalsTable() {
  const columns = useApprovalsColumns({
    canDecide: true,
    canManage: true,
    memberName,
    setDecideTarget: noop,
    setDelegateTarget: noop,
    handleEscalate: noop,
    setCancelTarget: noop,
    setDeleteTarget: noop,
  });

  function getRowKey(row: Approval) {
    return row.id;
  }

  function renderMobileCard(row: Approval) {
    return (
      <BuildMobileCard
        title={row.title}
        status={<ApprovalStatusBadge status={toApprovalStatus(row.status)} />}
        person={{ user: ownerOf(row.requestedById), role: "Requester" }}
        meta={[
          { label: "Type", value: entityTypeLabel(row.entityType) },
          { label: "Due", value: row.dueAt ? row.dueAt.slice(0, 10) : "—" },
        ]}
      />
    );
  }

  return (
    <DataTable
      data={APPROVAL_ROWS}
      columns={columns}
      getRowKey={getRowKey}
      minWidth="720px"
      className={PM_FILL_PANEL}
      mobileCard={renderMobileCard}
      pagination={STATIC_PAGINATION}
    />
  );
}

function RisksWithSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedIds(new Set());
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const columns = buildRiskColumns({
    canManage: true,
    memberName,
    ownerOf,
    onEdit: noop,
    onDelete: noop,
  });

  function getRowKey(row: Risk) {
    return row.id;
  }

  function renderMobileCard(row: Risk) {
    return (
      <RiskMobileCard
        risk={row}
        canManage
        ownerOf={ownerOf}
        onEdit={noop}
        onDelete={noop}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {selectedIds.size > 0 && (
        <div
          role="region"
          aria-label="Bulk actions"
          className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm"
        >
          <Badge variant="secondary">{selectedIds.size} selected</Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Clear selection"
            onClick={() => setSelectedIds(new Set())}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}
      <DataTable
        data={RISK_ROWS}
        columns={columns}
        getRowKey={getRowKey}
        minWidth="720px"
        className={PM_FILL_PANEL}
        mobileCard={renderMobileCard}
        pagination={STATIC_PAGINATION}
        selection={{
          selected: selectedIds,
          onChange: setSelectedIds,
        }}
      />
    </div>
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
            className={PM_FILL_PANEL}
            mobileCard={renderMobileCard}
            pagination={STATIC_PAGINATION}
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
          <DataTable
            data={QA_RUN_RESULTS}
            columns={columns}
            getRowKey={getRowKey}
            minWidth="640px"
            className={PM_FILL_PANEL}
            mobileCard={renderMobileCard}
            pagination={STATIC_PAGINATION}
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

export function GovernanceQaGallery() {
  return (
    <div className="flex flex-col gap-8 p-4">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">
          Governance &amp; QA surfaces
        </h1>
        <p className="mt-1 text-label text-muted-foreground">
          Browser-verifiable layout facts for Governance and QA list surfaces:
          horizontal overflow, computed control heights, focus order, and ARIA structure.
        </p>
      </header>

      <GalleryList
        caseId="governance-risks"
        title="Risks list · status filter"
        actions={ONE_ACTION}
        filterCount={2}
        body={<RisksTable />}
      />
      <GalleryList
        caseId="qa-test-cases"
        title="QA test cases · suite + status filters"
        actions={TWO_ACTIONS}
        filterCount={2}
        body={<QaTestCasesTable />}
      />
      <GalleryList
        caseId="incidents"
        title="Incidents list · severity + status filters"
        actions={ONE_ACTION}
        filterCount={2}
        body={<IncidentsTable />}
      />
      <GalleryList
        caseId="decisions"
        title="Decisions log · status filter"
        actions={ONE_ACTION}
        filterCount={1}
        body={<DecisionsTable />}
      />
      <GalleryList
        caseId="approvals"
        title="Approvals · status + entity type filters"
        actions={ONE_ACTION}
        filterCount={2}
        body={<ApprovalsTable />}
      />
      <GalleryList
        caseId="risks-with-selection"
        title="Risks list · keyboard selection"
        actions={ONE_ACTION}
        filterCount={2}
        body={<RisksWithSelection />}
      />
      <GalleryList
        caseId="loading-governance"
        title="Loading — governance list"
        actions={ONE_ACTION}
        filterCount={2}
        body={
          <DataTableSkeleton
            mobileCards
            rows={8}
            headers={[...RISK_TABLE_HEADERS]}
            className="flex-1"
          />
        }
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
      <GalleryList
        caseId="loading-incidents"
        title="Loading — incidents"
        actions={ONE_ACTION}
        filterCount={2}
        body={
          <DataTableSkeleton
            mobileCards
            rows={8}
            headers={[...INCIDENTS_TABLE_HEADERS]}
            className="flex-1"
          />
        }
      />
      <GalleryList
        caseId="loading-decisions"
        title="Loading — decisions"
        actions={ONE_ACTION}
        filterCount={1}
        body={
          <DataTableSkeleton
            mobileCards
            rows={8}
            headers={[...DECISION_TABLE_HEADERS]}
            className="flex-1"
          />
        }
      />
      <GalleryList
        caseId="loading-approvals"
        title="Loading — approvals"
        actions={ONE_ACTION}
        filterCount={2}
        body={
          <DataTableSkeleton
            mobileCards
            rows={8}
            headers={[...APPROVALS_TABLE_HEADERS]}
            className="flex-1"
          />
        }
      />
      <GalleryList
        caseId="empty-governance"
        title="True empty — no risks"
        actions={ONE_ACTION}
        filterCount={2}
        body={
          <EmptyState
            className={PM_FILL_PANEL}
            illustrationPreset="documents"
            title="No risks recorded"
            description="Track project risks to stay ahead of blockers."
            action={{ label: "New Risk" }}
          />
        }
      />
      <GalleryList
        caseId="error-governance"
        title="Error state"
        actions={ONE_ACTION}
        filterCount={2}
        body={
          <ErrorState title="We could not load risks" className="flex-1" />
        }
      />
      <BudgetOverview />
      <IncidentDetailCase />
      <QaRunExecutionCase />
      <ReportsTabsCase />
    </div>
  );
}
