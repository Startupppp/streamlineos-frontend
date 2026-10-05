import type { BuildApprovalsCreateApprovalResponse } from "@/contracts/build-contracts.generated";
import type {
  Risk,
  TestCase,
  Decision,
  TestRunResult,
  TestResultStatus,
  TestCasePriority,
  ManagedProduct,
} from "@/types/projects";
import type { IncidentsCreateIncidentResponse } from "@/contracts/build-contracts.generated";
import type { OrgMember } from "@/hooks/api/organization";
import type { AccessResponse } from "@/hooks/api/access-schema";

export interface FixtureRow {
  id: number;
  name: string;
}

export function makeRows(
  count: number,
  overrides?: Partial<FixtureRow>,
): FixtureRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Row ${i + 1}`,
    ...overrides,
  }));
}

export const ACCESS_GRANTED_FIXTURE = {
  data: {
    isOrgOwner: false as const,
    scopes: { "build:view": "all" as const },
    modules: {},
  },
  isLoading: false,
} as const;

export const ACCESS_DENIED_FIXTURE = {
  data: { isOrgOwner: false as const, scopes: {}, modules: {} },
  isLoading: false,
} as const;

export const ACCESS_LOADING_FIXTURE = {
  data: undefined,
  isLoading: true,
} as const;

export function cursorPage<T>(
  items: T[],
  overrides?: { hasMore?: boolean; nextCursor?: string | null },
) {
  return {
    data: items,
    pagination: {
      limit: 25,
      hasMore: overrides?.hasMore ?? false,
      nextCursor: overrides?.nextCursor ?? null,
    },
  };
}

export function baseQueryResult<T>(overrides?: {
  data?: T;
  isLoading?: boolean;
  isError?: boolean;
  error?: unknown;
}) {
  return {
    data: overrides?.data,
    isLoading: overrides?.isLoading ?? false,
    isError: overrides?.isError ?? false,
    error: overrides?.error,
    refetch: jest.fn(),
  };
}

export const GALLERY_STUB_ACCESS: AccessResponse = {
  membershipId: null,
  scopes: {},
  isOrgOwner: true,
  canManageOrganizationMembership: false,
  modules: {},
};

export const GOVERNANCE_INCIDENT_MEMBERS: OrgMember[] = [
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

const GOV_RISK_LEVELS = ["low", "medium", "high"] as const;
const GOV_RISK_STATUSES = ["open", "mitigating", "monitoring", "accepted", "closed"] as const;

export const GOVERNANCE_RISK_ROWS: Risk[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  orgId: "org_gallery",
  projectId: 1,
  riskNumber: 100 + i,
  title: `Risk ${i + 1}: dependency on external vendor ${i + 1}`,
  description: null,
  probability: GOV_RISK_LEVELS[i % GOV_RISK_LEVELS.length],
  impact: GOV_RISK_LEVELS[(i + 1) % GOV_RISK_LEVELS.length],
  status: GOV_RISK_STATUSES[i % GOV_RISK_STATUSES.length],
  ownerId: i % 2 === 0 ? "user_priya" : "user_daniel",
  mitigation: null,
  linkedTicketId: null,
  createdBy: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  deletedAt: null,
}));

const GOV_QA_PRIORITIES = ["low", "medium", "high"] as const;
const GOV_QA_AUTOMATION = ["manual", "automated", "planned"] as const;
const GOV_QA_COMPONENTS = ["Checkout", "Reporting", "Auth", null] as const;

export const GOVERNANCE_QA_ROWS: TestCase[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  orgId: "org_gallery",
  projectId: 1,
  suiteId: null,
  caseNumber: 200 + i,
  title: `Test case ${i + 1}: verify ${(["login", "checkout", "report", "filter"] as const)[i % 4]} flow`,
  preconditions: null,
  steps: null,
  expectedResult: null,
  priority: GOV_QA_PRIORITIES[i % GOV_QA_PRIORITIES.length],
  component: GOV_QA_COMPONENTS[i % GOV_QA_COMPONENTS.length],
  linkedTicketId: null,
  automationStatus: GOV_QA_AUTOMATION[i % GOV_QA_AUTOMATION.length],
  createdBy: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  deletedAt: null,
}));

const GOV_INCIDENT_SEVERITIES = ["critical", "high", "medium", "low"] as const;
const GOV_INCIDENT_STATUSES = [
  "detected",
  "investigating",
  "mitigating",
  "resolved",
  "postmortem",
  "closed",
] as const;

export const GOVERNANCE_INCIDENT_ROWS: IncidentsCreateIncidentResponse[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  orgId: "org_gallery",
  projectId: 1,
  incidentNumber: 300 + i,
  title: `IncidentsCreateIncidentResponse ${i + 1}: ${(["API timeout", "DB connection pool exhausted", "CDN outage", "Auth service down"] as const)[i % 4]}`,
  description: null,
  severity: GOV_INCIDENT_SEVERITIES[i % GOV_INCIDENT_SEVERITIES.length],
  status: GOV_INCIDENT_STATUSES[i % GOV_INCIDENT_STATUSES.length],
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

const GOV_DECISION_STATUSES = ["proposed", "accepted", "superseded", "revisit"] as const;

export const GOVERNANCE_DECISION_ROWS: Decision[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  orgId: "org_gallery",
  projectId: 1,
  decisionNumber: 400 + i,
  title: `Decision ${i + 1}: ${(["Use PostgreSQL for main DB", "Adopt microservices", "Switch to Next.js", "Use Redis for caching"] as const)[i % 4]}`,
  context: null,
  decision: null,
  optionsConsidered: null,
  status: GOV_DECISION_STATUSES[i % GOV_DECISION_STATUSES.length],
  ownerId: i % 2 === 0 ? "user_priya" : "user_daniel",
  decidedAt: "2026-01-01T00:00:00.000Z",
  revisitAt: null,
  linkedTicketId: null,
  createdBy: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  deletedAt: null,
}));

const GOV_APPROVAL_ENTITIES = ["task", "milestone", "release", "budget"] as const;
const GOV_APPROVAL_STATUSES = ["requested", "pending", "approved", "rejected", "escalated"] as const;

export const GOVERNANCE_APPROVAL_ROWS: BuildApprovalsCreateApprovalResponse[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  revision: 1,
  orgId: "org_gallery",
  projectId: 1,
  entityType: GOV_APPROVAL_ENTITIES[i % GOV_APPROVAL_ENTITIES.length],
  entityId: i + 1,
  title: `Approval ${i + 1}: ${(["Deploy v2.0 to production", "Milestone sign-off", "Budget increase request", "Release gate"] as const)[i % 4]}`,
  reason: null,
  requestedById: i % 2 === 0 ? "user_priya" : "user_daniel",
  approverMembershipId: null,
  status: GOV_APPROVAL_STATUSES[i % GOV_APPROVAL_STATUSES.length],
  level: (i % 3) + 1,
  dueAt: i % 2 === 0 ? "2026-02-01T00:00:00.000Z" : null,
  decisionComment: null,
  decidedAt: null,
  createdBy: null,
  deletedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}));

const GOV_RESULT_STATUSES: TestResultStatus[] = ["not_run", "passed", "failed", "not_run", "passed"];
const GOV_RESULT_PRIORITIES: TestCasePriority[] = ["high", "medium", "low", "medium", "high"];

export const GOVERNANCE_QA_RUN_RESULTS: TestRunResult[] = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1,
  orgId: "org_demo",
  projectId: 1,
  runId: 1,
  testCaseId: i + 1,
  status: GOV_RESULT_STATUSES[i % GOV_RESULT_STATUSES.length] ?? "not_run",
  notes: null,
  executedBy: null,
  executedAt: null,
  linkedWorkItemId: null,
  testCase: {
    caseNumber: 200 + i,
    title: `Test case ${i + 1}: verify flow ${i + 1}`,
    priority: GOV_RESULT_PRIORITIES[i % GOV_RESULT_PRIORITIES.length] ?? "medium",
  },
}));

const MP_NAMES = [
  "Payments Platform",
  "Identity Service",
  "Notification Hub",
  "Analytics Engine",
  "Search Service",
  "Cache Layer",
  "Auth Gateway",
  "Data Pipeline",
  "Event Bus",
  "Config Store",
  "Audit Trail",
  "Content Delivery",
  "API Gateway",
  "SDK Tooling",
] as const;

export const MANAGED_PRODUCT_GALLERY_ROWS: ManagedProduct[] = Array.from({ length: 14 }, (_, i) => ({
  id: i + 1,
  orgId: "org-1",
  name: MP_NAMES[i % 14] ?? "Product",
  key: `MP-${100 + i}`,
  description: i % 3 === 0 ? `Core service #${i + 1} for the platform` : null,
  status: i % 3 === 2 ? "archived" : "active",
  ownerId: i % 2 === 0 ? "user-1" : null,
  ownerMembershipId: i % 2 === 0 ? 1 : null,
  vision: null,
  missionStatement: null,
  targetCustomer: null,
  differentiators: null,
  currentPhase: null,
  targetLaunchDate: null,
  successMetrics: null,
  version: 1,
  deletedAt: null,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-11-01T00:00:00Z",
}));
