"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";

const noContentC = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  Interview,
  CreateInterviewInput,
  UpdateInterviewInput,
} from "@/types/hr";
import type {
  ScorecardCriterion,
  ScorecardTemplate,
  InterviewScorecard,
  ScheduleInterviewInput,
  InterviewSla,
  HrSlaReport,
  InterviewQuestion,
  CreateQuestionInput,
  InterviewerAvailabilityResponse,
  InterviewStats,
  InterviewsParams,
  HrBookingLink,
} from "@/types/hr/interview-management";
export type {
  ScorecardCriterion,
  ScorecardTemplate,
  InterviewScorecard,
  ScheduleInterviewInput,
  InterviewSla,
  CandidateSlaRecord,
  SlaReportStage,
  SlaReportMonth,
  SlaReportStageSummary,
  HrSlaReport,
  InterviewQuestion,
  CreateQuestionInput,
  BusyBlock,
  InterviewerAvailability,
  InterviewerAvailabilityResponse,
  InterviewStats,
  InterviewsParams,
  HrBookingLink,
} from "@/types/hr/interview-management";
import {
  unwrapRecruitmentItems,
  type RecruitmentListResponse,
} from "./list-response";
import { useGatedQuery } from "@/hooks/api/gated-query";

const interviewStatsContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/interviews-schema").then((m) => m.interviewStatsSchema),
);
const interviewListContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/interviews-schema").then((m) => m.interviewListResponseSchema),
);
const interviewContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/interviews-schema").then((m) => m.interviewSchema),
);
const interviewSuccessContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/interviews-schema").then((m) => m.interviewSuccessSchema),
);
const scorecardTemplateListContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/interviews-schema").then((m) => m.scorecardTemplateListSchema),
);
const scorecardTemplateContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/interviews-schema").then((m) => m.scorecardTemplateSchema),
);
const interviewScorecardContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/interviews-schema").then((m) => m.interviewScorecardSchema),
);
const scheduleInterviewContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/interviews-schema").then((m) => m.scheduleInterviewWithPanelSchema),
);
const interviewSlaListContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/interviews-schema").then((m) => m.interviewSlaListSchema),
);
const interviewSlaContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/interviews-schema").then((m) => m.interviewSlaSchema),
);
const slaReportContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/interviews-schema").then((m) => m.slaReportResponseSchema),
);
const interviewQuestionListContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/interviews-schema").then((m) => m.interviewQuestionListSchema),
);
const interviewQuestionContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/interviews-schema").then((m) => m.interviewQuestionRowSchema),
);
const interviewerPerformanceContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/interviews-schema").then((m) => m.interviewerPerformanceSchema),
);
const bookingLinkListContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/interviews-schema").then((m) => m.bookingLinkListSchema),
);
const bookingCancelContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/interviews-schema").then((m) => m.bookingCancelResponseSchema),
);
const availabilityContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/interviews-schema").then((m) => m.availabilityResponseSchema),
);

interface InterviewerPerformanceStat {
  interviewerId: string;
  interviewerName: string | null;
  interviewerEmail: string | null;
  totalAssigned: number;
  submitted: number;
  pending: number;
  avgHoursToSubmit: number | null;
  recommendations: Record<string, number>;
}

interface InterviewerPerformanceResponse {
  stats: InterviewerPerformanceStat[];
  period: { days: number; since: string };
}

const INTERVIEW_SLAS_KEY = humanResourcesQueryKeys.hr.interviewSlas();
const SLA_REPORT_KEY = humanResourcesQueryKeys.hr.slaReport();
const INTERVIEW_STATS_KEY = [...humanResourcesQueryKeys.hr.all, "interviewStats"] as const;

export function useInterviewStats(options?: { enabled?: boolean }) {
  return useGatedQuery("hr:interviews:view", {
    enabled: options?.enabled ?? true,
    queryKey: INTERVIEW_STATS_KEY,
    queryFn: ({ signal }) => apiClient.get<InterviewStats>("/hr/recruitment/interviews/stats", undefined, signal, interviewStatsContract),
    staleTime: 2 * 60_000,
  });
}

export function useInterviews(
  params?: InterviewsParams,
  options?: { enabled?: boolean },
) {
  const queryParams: Record<string, unknown> = { limit: params?.limit ?? 100 };
  if (params?.candidateId) queryParams.candidateId = params.candidateId;
  if (params?.upcoming != null) queryParams.upcoming = params.upcoming ? "true" : "false";
  if (params?.relevant != null) queryParams.relevant = params.relevant ? "true" : "false";

  return useGatedQuery("hr:interviews:view", {
    enabled: options?.enabled ?? true,
    queryKey: humanResourcesQueryKeys.hr.interviews(queryParams),
    queryFn: async ({ signal }): Promise<Interview[]> => {
      const res = await apiClient.get<Interview[] | RecruitmentListResponse<Interview>>(
        "/hr/recruitment/interviews",
        queryParams,
        signal,
        interviewListContract,
      );
      return unwrapRecruitmentItems(res);
    },
    staleTime: 2 * 60_000,
  });
}

export function useCreateInterview() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["hr", "recruitment", "interviews", "create"],
    mutationFn: (data: CreateInterviewInput) =>
      apiClient.post<Interview>("/hr/recruitment/interviews", data, undefined, interviewContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.interviews() });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.recruitmentStats() });
      qc.invalidateQueries({ queryKey: INTERVIEW_STATS_KEY });
    },
  });
}

export function useUpdateInterview() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["hr", "recruitment", "interviews", "update"],
    mutationFn: ({ id, ...data }: UpdateInterviewInput & { id: number }) =>
      apiClient.patch<{ success: boolean }>(`/hr/recruitment/interviews/${id}`, data, undefined, interviewSuccessContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.interviews() });
      qc.invalidateQueries({ queryKey: INTERVIEW_STATS_KEY });
    },
  });
}

export function useScorecardTemplates() {
  return useGatedQuery("hr:interviews:view", {
    queryKey: humanResourcesQueryKeys.hr.scorecardTemplates(),
    queryFn: ({ signal }) => apiClient.get<ScorecardTemplate[]>("/hr/recruitment/scorecard-templates", undefined, signal, scorecardTemplateListContract),
    staleTime: 2 * 60_000,
  });
}

export function useCreateScorecardTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["hr", "recruitment", "scorecard-templates", "create"],
    mutationFn: (data: { name: string; criteria: ScorecardCriterion[] }) =>
      apiClient.post<ScorecardTemplate>("/hr/recruitment/scorecard-templates", data, undefined, scorecardTemplateContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.scorecardTemplates() }),
  });
}

export function useUpdateScorecardTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["hr", "recruitment", "scorecard-templates", "update"],
    mutationFn: ({ id, ...data }: { id: number; name?: string; criteria?: ScorecardCriterion[] }) =>
      apiClient.patch<{ success: boolean }>(`/hr/recruitment/scorecard-templates/${id}`, data, undefined, interviewSuccessContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.scorecardTemplates() }),
  });
}

export function useDeleteScorecardTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["hr", "recruitment", "scorecard-templates", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/recruitment/scorecard-templates/${id}`, undefined, undefined, interviewSuccessContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.scorecardTemplates() }),
  });
}

export function useSubmitScorecard(interviewId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["hr", "recruitment", "interviews", "submit-scorecard", interviewId],
    mutationFn: (data: {
      ratings: Record<string, number>;
      recommendation: "HIRE" | "NO_HIRE" | "MAYBE";
      notes?: string;
      templateId?: number;
      isBlindMode?: boolean;
    }) =>
      apiClient.post<InterviewScorecard>(
        `/hr/recruitment/interviews/${interviewId}/scorecard`,
        data,
        undefined,
        interviewScorecardContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.interviewScorecard(interviewId) });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.interviewScorecardSummary(interviewId) });
    },
  });
}

export function useScheduleInterview() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["hr", "recruitment", "interviews", "schedule"],
    mutationFn: (data: ScheduleInterviewInput) =>
      apiClient.post<Interview>("/hr/recruitment/interviews/schedule", data, undefined, scheduleInterviewContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.interviews() });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.recruitmentStats() });
      qc.invalidateQueries({ queryKey: INTERVIEW_STATS_KEY });
    },
  });
}

export function useInterviewSlas() {
  return useGatedQuery("hr:interviews:view", {
    queryKey: INTERVIEW_SLAS_KEY,
    queryFn: ({ signal }) => apiClient.get<InterviewSla[]>("/hr/recruitment/interviews/slas", undefined, signal, interviewSlaListContract),
    staleTime: 2 * 60_000,
  });
}

export function useUpsertInterviewSla() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["hr", "recruitment", "interview-slas", "upsert"],
    mutationFn: (data: { stage: string; maxHours: number; warningHours: number }) =>
      apiClient.put<InterviewSla>("/hr/recruitment/interviews/slas", data, undefined, interviewSlaContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: INTERVIEW_SLAS_KEY }),
  });
}

export function useHrSlaReport() {
  const canInterviews = useCan("hr:interviews:view");
  return useQuery({
    queryKey: SLA_REPORT_KEY,
    queryFn: ({ signal }) => apiClient.get<HrSlaReport>("/hr/recruitment/interviews/sla-report", undefined, signal, slaReportContract),
    staleTime: 2 * 60_000,
    enabled: canInterviews,
  });
}

export function useBulkRescheduleInterviews() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["hr", "recruitment", "interviews", "bulk-reschedule"],
    mutationFn: async ({ ids, scheduledAt }: { ids: number[]; scheduledAt: string }) => {
      await Promise.all(
        ids.map((id) =>
          apiClient.patch<{ success: boolean }>(`/hr/recruitment/interviews/${id}`, { scheduledAt }, undefined, interviewSuccessContract)
        )
      );
      return { rescheduled: ids.length };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.interviews() }),
  });
}

export function useInterviewQuestions(filters?: {
  category?: string;
  role?: string;
  difficulty?: string;
  q?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.category) params.set("category", filters.category);
  if (filters?.role) params.set("role", filters.role);
  if (filters?.difficulty) params.set("difficulty", filters.difficulty);
  if (filters?.q) params.set("q", filters.q);
  const qs = params.toString();

  return useGatedQuery("hr:employees:view", {
    queryKey: [...humanResourcesQueryKeys.hr.all, "interviewQuestions", filters] as const,
    queryFn: ({ signal }) =>
      apiClient.get<InterviewQuestion[]>(`/hr/interview-questions${qs ? `?${qs}` : ""}`, undefined, signal, interviewQuestionListContract),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useCreateInterviewQuestion() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "interview-questions", "create"],
    mutationFn: (data: CreateQuestionInput) =>
      apiClient.post<InterviewQuestion>("/hr/interview-questions", data, undefined, interviewQuestionContract),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "interviewQuestions"] }),
  });
}

export function useUpdateInterviewQuestion(questionId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "interview-questions", "update", questionId],
    mutationFn: (data: Partial<CreateQuestionInput> & { isActive?: boolean }) =>
      apiClient.patch<{ success: boolean }>(`/hr/interview-questions/${questionId}`, data, undefined, interviewSuccessContract),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "interviewQuestions"] }),
  });
}

export function useDeleteInterviewQuestion(questionId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "interview-questions", "delete", questionId],
    mutationFn: () =>
      apiClient.delete<void>(`/hr/interview-questions/${questionId}`, undefined, undefined, noContentC),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "interviewQuestions"] }),
  });
}

export function useInterviewerPerformance(days = 90) {
  const canInterviews = useCan("hr:interviews:view");
  return useQuery<InterviewerPerformanceResponse>({
    queryKey: humanResourcesQueryKeys.hr.interviewerPerformance(days),
    queryFn: ({ signal }) =>
      apiClient.get<InterviewerPerformanceResponse>(
        `/hr/recruitment/interviewer-performance?days=${days}`,
        undefined,
        signal,
        interviewerPerformanceContract,
      ),
    staleTime: 5 * 60 * 1000,
    enabled: canInterviews,
  });
}

export function useHrBookingLinks() {
  return useGatedQuery("hr:interviews:view", {
    queryKey: humanResourcesQueryKeys.hr.bookingLinks(),
    queryFn: ({ signal }) => apiClient.get<HrBookingLink[]>("/hr/recruitment/booking-links", undefined, signal, bookingLinkListContract),
    staleTime: 2 * 60_000,
  });
}

export function useRevokeBookingLink() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["hr", "recruitment", "booking-links", "revoke"],
    mutationFn: (id: number) =>
      apiClient.patch<{ success: boolean }>(`/hr/recruitment/booking-links/${id}`, {}, undefined, bookingCancelContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.bookingLinks() }),
  });
}

export function useInterviewerAvailability(
  interviewerIds: string[],
  date: string | null
) {
  const enabled = interviewerIds.length > 0 && !!date;
  return useGatedQuery<InterviewerAvailabilityResponse>("hr:interviews:view", {
    queryKey: [...humanResourcesQueryKeys.hr.all, "interviewerAvailability", date, interviewerIds],
    queryFn: ({ signal }) =>
      apiClient.get<InterviewerAvailabilityResponse>(
        `/hr/recruitment/interviewers/availability?interviewerIds=${interviewerIds.join(",")}&date=${date}`,
        undefined,
        signal,
        availabilityContract,
      ),
    enabled,
    staleTime: 60 * 1000,
  });
}
