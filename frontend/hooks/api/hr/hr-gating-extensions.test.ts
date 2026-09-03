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
  ["hr/global.ts", "useContracts", "/hr/global/contracts", "hr:contracts:view", true],
  ["hr/benefits.ts", "useBenefitPlans", "/hr/benefits/plans", "hr:benefits:view", true],
  ["hr/benefits.ts", "useMyBenefits", "/hr/benefits/my", "hr:benefits:view", true],
  ["hr/benefits.ts", "useDependents", "/hr/benefits/dependents", "hr:benefits:view", true],
  ["hr/benefits.ts", "useInsuranceClaims", "/hr/benefits/claims", "hr:benefits:view", true],
  ["hr/calibration.ts", "useCalibrationEntries", "/hr/performance/calibration/cycles/", "hr:performance:manage", true],
  ["hr/calibration.ts", "useNineBox", "/hr/performance/calibration/nine-box", "hr:performance:manage", true],
  ["hr/background-verification.ts", "useBackgroundVerifications", "/hr/background-verification", "hr:sensitive:view", true],
  ["hr/pip.ts", "usePIPs", "/hr/performance/pip", "hr:performance:view", true],
  ["hr/feedback.ts", "useFeedbackCycles", "/hr/feedback/cycles", "hr:performance:view", true],
  ["hr/feedback.ts", "useMyPendingReviews", "/hr/feedback/my-reviews", "hr:performance:view", true],
  ["hr/feedback.ts", "useFeedbackResults", "/hr/feedback/results/", "hr:performance:view", true],
  ["hr/kpis.ts", "useKpis", "/hr/kpis", "hr:performance:view", true],
  ["hr/kpis.ts", "useCompetencyFrameworks", "/hr/kpis/frameworks", "hr:performance:view", true],
  ["hr/hr-automations.ts", "useHrAutomations", "/hr/automations", "hr:automations:view", true],
  ["hr/hr-automations.ts", "useHrAutomationEvents", "/hr/automations/events", "hr:automations:view", true],
  ["hr/hr-automations.ts", "useHrAutomationRuns", "/hr/automations", "hr:automations:view", true],
  ["hr/engagement.ts", "useEngagementOverview", "/hr/engagement/overview", "hr:engagement:view", true],
  ["hr/engagement.ts", "useMyMoodHistory", "/hr/engagement/mood/history", "hr:engagement:view", true],
  ["hr/engagement.ts", "useOrgMoodAggregate", "/hr/engagement/mood/aggregate", "hr:engagement:manage", true],
  ["hr/engagement.ts", "useEngagementBadges", "/hr/engagement/badges", "hr:engagement:view", true],
  ["hr/engagement.ts", "useLeaderboard", "/hr/engagement/points/leaderboard", "hr:engagement:view", true],
  ["hr/engagement.ts", "useEngagementPolls", "/hr/engagement/polls", "hr:engagement:view", true],
  ["hr/engagement.ts", "usePollResults", "/hr/engagement/polls/", "hr:engagement:view", true],
  ["hr/engagement.ts", "useEngagementCampaigns", "/hr/engagement/campaigns", "hr:engagement:view", true],
  ["hr/enterprise-comp.ts", "useTimeDevices", "/hr/enterprise/comp/devices", "hr:biometric:manage", true],
  ["hr/enterprise-comp.ts", "useDeviceSyncLogs", "/hr/enterprise/comp/devices/sync-logs", "hr:biometric:manage", true],
  ["hr/enterprise-comp.ts", "useFailedSyncs", "/hr/enterprise/comp/devices/failed-syncs", "hr:biometric:manage", true],
  ["hr/enterprise-comp.ts", "useCompCycles", "/hr/enterprise/comp/planning/cycles", "hr:compensation:manage", true],
  ["hr/enterprise-comp.ts", "useCompCycle", "/hr/enterprise/comp/planning/cycles/", "hr:compensation:manage", true],
  ["hr/enterprise-comp.ts", "useCompRecommendations", "/hr/enterprise/comp/planning/recommendations", "hr:compensation:manage", true],
  ["hr/enterprise-comp.ts", "useBudgetPools", "/hr/enterprise/comp/planning/cycles/", "hr:compensation:manage", true],
  ["hr/enterprise-comp.ts", "useEquityGrants", "/hr/enterprise/comp/equity/grants", "hr:equity:view", true],
  ["hr/enterprise-comp.ts", "useVestingSchedule", "/hr/enterprise/comp/equity/grants/", "hr:equity:view", true],
  ["hr/enterprise-comp.ts", "useWorkforceCostSummary", "/hr/enterprise/comp/costing/summary", "hr:analytics:read", true],
  ["hr/enterprise-comp.ts", "useCostByDepartment", "/hr/enterprise/comp/costing/by-department", "hr:analytics:read", true],
  ["hr/enterprise-comp.ts", "useCostByLocation", "/hr/enterprise/comp/costing/by-location", "hr:analytics:read", true],
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
  ["hr/performance.ts", "useUpdateGoal", "hr:performance:view"],
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
  ["hr/global.ts", "useCreateContract", "hr:contracts:manage"],
  ["accounting/ap.ts", "useBillSubmitApproval", "accounting:payables:manage"],
  ["accounting/ap.ts", "useBillApprove", "accounting:payables:approve"],
  ["accounting/ap.ts", "useBillCancel", "accounting:payables:manage"],
  ["accounting/accounting-ai.ts", "useExplainVariance", "accounting:ai:use"],
  ["accounting/accounting-ai.ts", "useExplainReconciliation", "accounting:ai:use"],
  ["accounting/accounting-ai.ts", "useExtractDocument", "accounting:ai:use"],
  ["payroll/loan-adjustments.ts", "useCreateLoanAdjustment", "payroll:runs:update"],
  ["hr/benefits.ts", "useCreateBenefitPlan", "hr:benefits:manage"],
  ["hr/benefits.ts", "useUpdateBenefitPlan", "hr:benefits:manage"],
  ["hr/benefits.ts", "useEnroll", "hr:benefits:view"],
  ["hr/benefits.ts", "useWaive", "hr:benefits:view"],
  ["hr/benefits.ts", "useAddDependent", "hr:benefits:view"],
  ["hr/benefits.ts", "useDeleteDependent", "hr:benefits:view"],
  ["hr/benefits.ts", "useReviewClaim", "hr:benefits:manage"],
  ["hr/calibration.ts", "useUpsertCalibrationEntry", "hr:performance:manage"],
  ["hr/background-verification.ts", "useCreateBackgroundVerification", "hr:sensitive:manage"],
  ["hr/background-verification.ts", "useUpdateBackgroundVerification", "hr:sensitive:manage"],
  ["hr/pip.ts", "useCreatePIP", "hr:performance:manage"],
  ["hr/pip.ts", "useUpdatePIP", "hr:performance:manage"],
  ["hr/feedback.ts", "useCreateFeedbackCycle", "hr:performance:manage"],
  ["hr/feedback.ts", "useUpdateFeedbackCycleStatus", "hr:performance:manage"],
  ["hr/feedback.ts", "useSubmitFeedbackResponse", "hr:performance:view"],
  ["hr/kpis.ts", "useCreateKpi", "hr:performance:manage"],
  ["hr/kpis.ts", "useUpdateKpi", "hr:performance:manage"],
  ["hr/kpis.ts", "useDeleteKpi", "hr:performance:manage"],
  ["hr/kpis.ts", "useCreateCompetencyFramework", "hr:performance:manage"],
  ["hr/kpis.ts", "useCreateCompetency", "hr:performance:manage"],
  ["hr/hr-automations.ts", "useCreateHrAutomation", "hr:automations:manage"],
  ["hr/hr-automations.ts", "useUpdateHrAutomation", "hr:automations:manage"],
  ["hr/hr-automations.ts", "useToggleHrAutomation", "hr:automations:manage"],
  ["hr/hr-automations.ts", "useDeleteHrAutomation", "hr:automations:manage"],
  ["hr/hr-automations.ts", "useTestHrAutomation", "hr:automations:manage"],
  ["hr/engagement.ts", "useMoodCheckin", "hr:engagement:view"],
  ["hr/engagement.ts", "useAwardBadge", "hr:engagement:manage"],
  ["hr/engagement.ts", "useCreatePoll", "hr:engagement:manage"],
  ["hr/engagement.ts", "useUpdatePoll", "hr:engagement:manage"],
  ["hr/engagement.ts", "useVotePoll", "hr:engagement:view"],
  ["hr/engagement.ts", "useCreateCommunity", "hr:engagement:view"],
  ["hr/engagement.ts", "useJoinCommunity", "hr:engagement:view"],
  ["hr/engagement.ts", "useLeaveCommunity", "hr:engagement:view"],
  ["hr/engagement.ts", "useCreateCampaign", "hr:engagement:manage"],
  ["hr/engagement.ts", "useUpdateCampaign", "hr:engagement:manage"],
  ["hr/engagement.ts", "useDeleteCampaign", "hr:engagement:manage"],
  ["hr/enterprise-comp.ts", "useCreateTimeDevice", "hr:biometric:manage"],
  ["hr/enterprise-comp.ts", "useUpdateTimeDevice", "hr:biometric:manage"],
  ["hr/enterprise-comp.ts", "useDeleteTimeDevice", "hr:biometric:manage"],
  ["hr/enterprise-comp.ts", "useCreateCompCycle", "hr:compensation:manage"],
  ["hr/enterprise-comp.ts", "useCalibrateRecommendation", "hr:compensation:manage"],
  ["hr/enterprise-comp.ts", "useCreateEquityGrant", "hr:equity:manage"],
  ["hr/enterprise-comp.ts", "useRecordExercise", "hr:equity:manage"],
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
