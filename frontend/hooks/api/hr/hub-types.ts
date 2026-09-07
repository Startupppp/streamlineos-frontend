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
import type { PaginatedResignations } from "./exit";
import type { ProbationListResponse } from "./probation";
import type { JobRequisition } from "./requisitions";
import type { ServiceDeliveryOpsInbox } from "./service-delivery";
import type { OfferListItem } from "./recruitment/offers";
import type { RecruitmentListResponse } from "./recruitment/list-response";

export interface HrHubAccess {
  canAnalytics: boolean;
  canLeaves: boolean;
  canLeaveCalendar: boolean;
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

export const EMPTY_HR_HUB_ACCESS: HrHubAccess = {
  canAnalytics: false,
  canLeaves: false,
  canLeaveCalendar: false,
  canAttendanceManage: false,
  canAttendanceView: false,
  canProbation: false,
  canExit: false,
  canCases: false,
  canDocuments: false,
  canInterviews: false,
  canOffers: false,
  canRequisitions: false,
  canRequisitionsManage: false,
  canEmployees: false,
  canOnboarding: false,
  canPayrollRuns: false,
  canPayrollRunsCreate: false,
  canLeavesApprove: false,
  canAssets: false,
  canWorkflowsApprove: false,
  canAnnouncements: false,
  canPerformance: false,
  canBenefits: false,
  canExpenses: false,
  canCompliance: false,
};

export interface HrHubSectionError {
  status: "error";
  code: "HR_HUB_SECTION_UNAVAILABLE";
  message: "This section is temporarily unavailable.";
}

export type HrHubSection<T> =
  | { status: "ok"; data: T }
  | HrHubSectionError;

export interface HrHubSections {
  commandCenter: HrHubSection<HrCommandCenterData> | null;
  dashboardMetrics: HrHubSection<HrDashboardMetrics> | null;
  onboardingStatus: HrHubSection<HrOnboardingStatus> | null;
  leaveCalendar: HrHubSection<HrLeaveCalendarEntry[]> | null;
  pendingWfh: HrHubSection<WfhRequest[]> | null;
  probation: HrHubSection<ProbationListResponse> | null;
  resignations: HrHubSection<PaginatedResignations> | null;
  documentStats: HrHubSection<HrDocumentStats> | null;
  holidays: HrHubSection<Holiday[]> | null;
  attendanceStatus: HrHubSection<TeamAttendanceStatusResponse> | null;
  opsInbox: HrHubSection<ServiceDeliveryOpsInbox> | null;
  interviews: HrHubSection<RecruitmentListResponse<Interview>> | null;
  recruitmentStats: HrHubSection<RecruitmentStats> | null;
  pendingOffers: HrHubSection<RecruitmentListResponse<OfferListItem>> | null;
  pendingRequisitions: HrHubSection<JobRequisition[]> | null;
}

export interface HrHubSnapshot {
  generatedAt: string;
  today: string;
  capabilities: HrHubAccess;
  sections: HrHubSections;
}

export interface HrHubViewProps {
  access: HrHubAccess;
  snapshot: HrHubSnapshot | undefined;
  isLoading: boolean;
  onRetry: () => void;
}

export interface HrHubCardProps<SectionKey extends keyof HrHubSections> {
  section: HrHubSections[SectionKey] | undefined;
  isLoading: boolean;
  onRetry: () => void;
}
