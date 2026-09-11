import { z } from "zod";
import type { HrHubSection } from "@/hooks/api/hr/hub-types";
import type {
  Holiday,
  Interview,
  RecruitmentStats,
  TeamAttendanceStatusResponse,
  WfhRequest,
} from "@/types/hr";
import type { HrCommandCenterData } from "./analytics";
import type {
  HrDashboardMetrics,
  HrLeaveCalendarEntry,
  HrOnboardingStatus,
} from "./dashboard";
import type { HrDocumentStats } from "./documents";
import type { Resignation } from "./exit";
import type { ProbationListResponse } from "./probation";
import type { JobRequisition } from "./requisitions";
import type { ServiceDeliveryOpsInbox } from "./service-delivery";
import type { OfferListItem } from "./recruitment/offers";
import type { RecruitmentListResponse } from "./recruitment/list-response";

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

const hrHubSectionErrorContract = z.object({
  status: z.literal("error"),
  code: z.literal("HR_HUB_SECTION_UNAVAILABLE"),
  message: z.literal("This section is temporarily unavailable."),
});

const section = <T,>(): z.ZodType<HrHubSection<T> | null> =>
  z.union([
    z.object({ status: z.literal("ok"), data: z.custom<T>(() => true) }),
    hrHubSectionErrorContract,
    z.null(),
  ]);

const hrHubSectionsContract = z.object({
  commandCenter: section<HrCommandCenterData>(),
  dashboardMetrics: section<HrDashboardMetrics>(),
  onboardingStatus: section<HrOnboardingStatus>(),
  leaveCalendar: section<HrLeaveCalendarEntry[]>(),
  pendingWfh: section<WfhRequest[]>(),
  probation: section<ProbationListResponse>(),
  resignations: section<{ data: Resignation[]; count: number }>(),
  documentStats: section<HrDocumentStats>(),
  holidays: section<Holiday[]>(),
  attendanceStatus: section<TeamAttendanceStatusResponse>(),
  opsInbox: section<ServiceDeliveryOpsInbox>(),
  interviews: section<RecruitmentListResponse<Interview>>(),
  recruitmentStats: section<RecruitmentStats>(),
  pendingOffers: section<RecruitmentListResponse<OfferListItem>>(),
  pendingRequisitions: section<JobRequisition[]>(),
});

export const hrHubSnapshotContract = z.object({
  generatedAt: z.string(),
  today: z.string(),
  capabilities: hrHubAccessContract,
  sections: hrHubSectionsContract,
});
