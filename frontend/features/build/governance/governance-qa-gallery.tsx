"use client";

import { DataTableSkeleton, DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PM_FILL_PANEL } from "@/components/pm-chrome";
import type { NamedUser } from "@/lib/person-display";
import type { Risk, TestCase } from "@/types/projects";
import {
  buildTestCaseColumns,
  TestCaseMobileCard,
  TEST_CASE_TABLE_HEADERS,
} from "@/features/build/qa/test-case-columns";
import {
  GalleryList,
  ONE_ACTION,
  TWO_ACTIONS,
} from "@/features/build/shared/build-list-gallery-cases";
import {
  buildRiskColumns,
  RiskMobileCard,
  RISK_TABLE_HEADERS,
} from "./risks-table-columns";

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

const STATIC_PAGINATION = {
  mode: "cursor",
  pageSize: 50,
  hasMore: true,
  hasPrevious: true,
  onNext: noop,
  onPrevious: noop,
} as const;

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
    </div>
  );
}
