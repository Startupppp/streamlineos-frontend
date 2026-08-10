"use client";

import { useCan } from "@/hooks/api/access";

export interface HrHubAccess {
  canAnalytics: boolean;
  canLeaves: boolean;
  canAttendanceManage: boolean;
  canAttendanceView: boolean;
  canProbation: boolean;
  canExit: boolean;
  canCases: boolean;
  canDocuments: boolean;
  canInterviews: boolean;
  canOffers: boolean;
  canRequisitions: boolean;
  canRequisitionsManage: boolean;
  canEmployees: boolean;
  canOnboarding: boolean;
  canPayrollRuns: boolean;
  canPayrollRunsCreate: boolean;
  canLeavesApprove: boolean;
  canAssets: boolean;
  canWorkflowsApprove: boolean;
  canAnnouncements: boolean;
  canPerformance: boolean;
  canBenefits: boolean;
  canExpenses: boolean;
  canCompliance: boolean;
}

export function useHrHubAccess(): HrHubAccess {
  return {
    canAnalytics: useCan("hr:analytics:read"),
    canLeaves: useCan("hr:leaves:view"),
    canAttendanceManage: useCan("hr:attendance:manage"),
    canAttendanceView: useCan("hr:attendance:view"),
    canProbation: useCan("hr:probation:view"),
    canExit: useCan("hr:exit:view"),
    canCases: useCan("hr:cases:view"),
    canDocuments: useCan("hr:documents:view"),
    canInterviews: useCan("hr:interviews:view"),
    canOffers: useCan("hr:offers:view"),
    canRequisitions: useCan("hr:requisitions:view"),
    canRequisitionsManage: useCan("hr:requisitions:manage"),
    canEmployees: useCan("hr:employees:view"),
    canOnboarding: useCan("hr:onboarding:manage"),
    canPayrollRuns: useCan("payroll:runs:view"),
    canPayrollRunsCreate: useCan("payroll:runs:create"),
    canLeavesApprove: useCan("hr:leaves:approve"),
    canAssets: useCan("hr:assets:view"),
    canWorkflowsApprove: useCan("hr:workflows:approve"),
    canAnnouncements: useCan("hr:announcements:manage"),
    canPerformance: useCan("hr:performance:manage"),
    canBenefits: useCan("hr:benefits:view"),
    canExpenses: useCan("hr:expenses:view"),
    canCompliance: useCan("hr:compliance:manage"),
  };
}

export const HUB_RESIGNATIONS_PARAMS = { page: 1, limit: 5 } as const;
