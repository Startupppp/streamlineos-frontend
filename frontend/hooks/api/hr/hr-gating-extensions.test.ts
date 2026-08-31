import { readFileSync } from "node:fs";
import { join } from "node:path";

type GatingCase = readonly [
  subPath: string,
  hookName: string,
  endpoint: string,
  permission: string,
  requiresHrModule: boolean,
];

const gatingCases: readonly GatingCase[] = [
  ["hr/performance.ts", "useReviewCycles", "/hr/performance/cycles", "hr:performance:view", true],
  ["hr/performance.ts", "useOneOnOneMeetings", "/hr/performance/one-on-ones", "hr:performance:view", true],
  ["hr/policies.ts", "useHrPolicies", "/hr/policies", "hr:policies:view", true],
  ["hr/policies.ts", "usePolicyConflicts", "/hr/policies/", "hr:policies:view", true],
  ["hr/policies.ts", "useOrgPolicyConflicts", "/hr/policies/conflicts", "hr:policies:view", true],
  ["hr/policies.ts", "usePolicyPreview", "/hr/policies/", "hr:policies:view", true],
  ["hr/salary-structures.ts", "useSalaryStructureTemplates", "/hr/payroll/salary-structures", "hr:salary:view", true],
  ["hr/global.ts", "useWorkAuthorizations", "/hr/global/work-authorizations", "hr:employees:view", true],
  ["hr/global.ts", "useComplianceRequirements", "/hr/global/compliance/requirements", "hr:compliance:manage", true],
  ["hr/global.ts", "useComplianceEvents", "/hr/global/compliance/events", "hr:compliance:manage", true],
  ["hr/global.ts", "useContracts", "/hr/global/contracts", "hr:employees:view", true],
];

type MutationGatingCase = readonly [
  subPath: string,
  hookName: string,
  permission: string,
];

const mutationGatingCases: readonly MutationGatingCase[] = [
  ["hr/performance.ts", "useCreateReviewCycle", "hr:performance:manage"],
  ["hr/performance.ts", "useUpdateReviewCycle", "hr:performance:manage"],
  ["hr/performance.ts", "useDeleteReviewCycle", "hr:performance:manage"],
  ["hr/performance.ts", "useCreatePerformanceReview", "hr:performance:manage"],
  ["hr/performance.ts", "useUpdateGoal", "hr:performance:manage"],
  ["hr/performance.ts", "useDeleteGoal", "hr:performance:manage"],
  ["hr/policies.ts", "useCreateHrPolicy", "hr:policies:manage"],
  ["hr/policies.ts", "useUpdateHrPolicy", "hr:policies:manage"],
  ["hr/policies.ts", "useActivatePolicy", "hr:policies:manage"],
  ["hr/policies.ts", "useArchivePolicy", "hr:policies:manage"],
  ["hr/salary-structures.ts", "useCreateSalaryTemplate", "hr:salary:manage"],
  ["hr/salary-structures.ts", "useUpdateSalaryTemplate", "hr:salary:manage"],
  ["hr/salary-structures.ts", "useDeleteSalaryTemplate", "hr:salary:manage"],
  ["hr/global.ts", "useCreateWorkAuth", "hr:compliance:manage"],
  ["hr/global.ts", "useUpdateWorkAuth", "hr:compliance:manage"],
  ["hr/global.ts", "useDeleteWorkAuth", "hr:compliance:manage"],
  ["hr/global.ts", "useCreateComplianceRequirement", "hr:compliance:manage"],
  ["hr/global.ts", "useUpdateComplianceRequirement", "hr:compliance:manage"],
  ["hr/global.ts", "useDeleteComplianceRequirement", "hr:compliance:manage"],
  ["hr/global.ts", "useMarkEventDone", "hr:compliance:manage"],
  ["hr/global.ts", "useCreateContract", "hr:compliance:manage"],
  ["accounting/ap.ts", "useBillSubmitApproval", "accounting:payables:manage"],
  ["accounting/ap.ts", "useBillApprove", "accounting:payables:approve"],
  ["accounting/ap.ts", "useBillCancel", "accounting:payables:manage"],
  ["accounting/accounting-ai.ts", "useExplainVariance", "accounting:ai:use"],
  ["accounting/accounting-ai.ts", "useExplainReconciliation", "accounting:ai:use"],
  ["accounting/accounting-ai.ts", "useExtractDocument", "accounting:ai:use"],
  ["payroll/loan-adjustments.ts", "useCreateLoanAdjustment", "payroll:runs:update"],
];

function hookSource(subPath: string, hookName: string): string {
  const source = readFileSync(
    join(process.cwd(), "hooks", "api", subPath),
    "utf8",
  );
  const marker = `export function ${hookName}(`;
  const start = source.indexOf(marker);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = source.indexOf("\nexport function ", start + marker.length);
  return source.slice(start, next === -1 ? undefined : next);
}

describe("RBAC gating extensions — query hooks", () => {
  it.each(gatingCases)(
    "%s %s gates on %s",
    (subPath, hookName, endpoint, permission, requiresHrModule) => {
      const source = hookSource(subPath, hookName);
      expect(source).toContain(endpoint);
      expect(source).toContain(`useCan("${permission}")`);
      expect(source).toMatch(/\benabled\s*[:,]/);
      if (requiresHrModule) expect(source).toContain('useModuleEnabled("hr")');
    },
  );
});

describe("RBAC gating extensions — mutation hooks", () => {
  it.each(mutationGatingCases)(
    "%s %s gates on %s",
    (subPath, hookName, permission) => {
      const source = hookSource(subPath, hookName);
      expect(source).toContain(`useAuthorizedMutation("${permission}"`);
    },
  );
});
