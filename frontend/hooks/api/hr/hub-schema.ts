import { z } from "zod";
import type { HrHubSections } from "@/hooks/api/hr/hub";

const hrHubAccessContract = z.object({
  canAnalytics: z.boolean(),
  canLeaves: z.boolean(),
  canLeaveCalendar: z.boolean(),
  canAttendanceManage: z.boolean(),
  canAttendanceView: z.boolean(),
  canProbation: z.boolean(),
  canExit: z.boolean(),
  canCases: z.boolean(),
  canDocuments: z.boolean(),
  canInterviews: z.boolean(),
  canOffers: z.boolean(),
  canRequisitions: z.boolean(),
  canRequisitionsManage: z.boolean(),
  canEmployees: z.boolean(),
  canOnboarding: z.boolean(),
  canPayrollRuns: z.boolean(),
  canPayrollRunsCreate: z.boolean(),
  canLeavesApprove: z.boolean(),
  canAssets: z.boolean(),
  canWorkflowsApprove: z.boolean(),
  canAnnouncements: z.boolean(),
  canPerformance: z.boolean(),
  canBenefits: z.boolean(),
  canExpenses: z.boolean(),
  canCompliance: z.boolean(),
});

const hrHubSectionsContract = z.custom<HrHubSections>((v) => typeof v === "object" && v !== null);

export const hrHubSnapshotContract = z.object({
  generatedAt: z.string(),
  today: z.string(),
  capabilities: hrHubAccessContract,
  sections: hrHubSectionsContract,
});
