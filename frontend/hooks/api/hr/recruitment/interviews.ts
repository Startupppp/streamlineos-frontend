"use client";

import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Interview,
  CreateInterviewInput,
  UpdateInterviewInput,
} from "@/types/hr";
import {
  unwrapRecruitmentItems,
  type RecruitmentListResponse,
} from "./list-response";

export interface ScorecardCriterion {
  name: string;
  weight: number;
}

export interface ScorecardTemplate {
  id: number;
  orgId: string;
  name: string;
  criteria: ScorecardCriterion[];
  isActive: boolean;
  createdBy: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface InterviewScorecard {
  id: number;
  interviewId: number;
  interviewerId: string;
  templateId: number | null;
  ratings: Record<string, number>;
  recommendation: "HIRE" | "NO_HIRE" | "MAYBE";
  notes: string | null;
  isBlindMode: boolean;
  submittedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}


export interface ScheduleInterviewInput {
  candidateId: number;
  jobPostingId?: number;
  scheduledAt: string;
  durationMinutes?: number;
  format?: "VIDEO" | "PHONE" | "IN_PERSON";
  interviewers: string[];
  notes?: string;
  meetLink?: string;
  createMeet?: boolean;
  notifyChannels?: { email: boolean; whatsapp: boolean };
}

export interface InterviewSla {
  id: number;
  orgId: string;
  stage: string;
  maxHours: number;
  warningHours: number;
  createdAt: string | null;
}

export interface CandidateSlaRecord {
  id: number;
  orgId: string;
  candidateId: number;
  stage: string;
  enteredAt: string;
  breachedAt: string | null;
  status: "ON_TRACK" | "AT_RISK" | "BREACHED";
  updatedAt: string | null;
}

export interface SlaReportStage {
  stage: string;
  total: number;
  breached: number;
  breachPct: number;
}

export interface SlaReportMonth {
  month: string;
  label: string;
  stages: SlaReportStage[];
  overall: { total: number; breached: number; breachPct: number };
}

export interface SlaReportStageSummary {
  stage: string;
  avgBreachPct: number;
  totalBreached: number;
  totalAll: number;
}

export interface HrSlaReport {
  report: SlaReportMonth[];
  stages: string[];
  stageSummary: SlaReportStageSummary[];
}

export interface InterviewQuestion {
  id: number;
  orgId: string;
  question: string;
  category: string;
  role: string | null;
  difficulty: string;
  tags: string[];
  sampleAnswer: string | null;
  keywords: string[];
  isActive: boolean;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateQuestionInput {
  question: string;
  category?: string;
  role?: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  tags?: string[];
  sampleAnswer?: string;
  keywords?: string[];
}

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

export interface BusyBlock {
  start: string;
  end: string;
  title: string;
}

export interface InterviewerAvailability {
  interviewerId: string;
  busyBlocks: BusyBlock[];
}

export interface InterviewerAvailabilityResponse {
  date: string;
  availability: InterviewerAvailability[];
}

export interface CreateBookingLinkInput {
  candidateId: number;
  jobPostingId?: number;
  interviewerIds: string[];
  durationMinutes?: number;
  interviewType?: "VIDEO" | "PHONE" | "IN_PERSON";
  availableSlots: { start: string; end: string }[];
  expiresInDays?: number;
  notes?: string;
}

export interface BookingLinkResponse {
  id: number;
  token: string;
  bookingUrl: string;
  expiresAt: string;
}

const INTERVIEW_SLAS_KEY = queryKeys.hr.interviewSlas();
const SLA_REPORT_KEY = queryKeys.hr.slaReport();
const INTERVIEW_STATS_KEY = [...queryKeys.hr.all, "interviewStats"] as const;

export interface InterviewStats {
  total: number;
  pending: number;
  passed: number;
  failed: number;
}

export function useInterviewStats(options?: { enabled?: boolean }) {
  return useQuery({
    enabled: options?.enabled ?? true,
    queryKey: INTERVIEW_STATS_KEY,
    queryFn: () => apiClient.get<InterviewStats>("/hr/recruitment/interviews/stats"),
    staleTime: 2 * 60_000,
  });
}

export type InterviewsParams = {
  candidateId?: number;
  upcoming?: boolean;
  relevant?: boolean;
  page?: number;
  pageSize?: number;
  /** @deprecated prefer page/pageSize */
  limit?: number;
  /** @deprecated prefer page/pageSize */
  offset?: number;
};

/**
 * Backend returns `{ items, total, page, pageSize, totalPages }`.
 * Hook normalizes to Interview[] so list/calendar UIs keep working.
 */
export function useInterviews(
  params?: InterviewsParams,
  options?: { enabled?: boolean },
) {
  const pageSize = params?.pageSize ?? params?.limit ?? 100;
  const page =
    params?.page ??
    (params?.offset != null ? Math.floor(params.offset / pageSize) + 1 : 1);
  const queryParams: Record<string, unknown> = { page, pageSize };
  if (params?.candidateId) queryParams.candidateId = params.candidateId;
  if (params?.upcoming != null) queryParams.upcoming = params.upcoming ? "true" : "false";
  if (params?.relevant != null) queryParams.relevant = params.relevant ? "true" : "false";

  return useQuery({
    enabled: options?.enabled ?? true,
    queryKey: queryKeys.hr.interviews(queryParams),
    queryFn: async (): Promise<Interview[]> => {
      const res = await apiClient.get<Interview[] | RecruitmentListResponse<Interview>>(
        "/hr/recruitment/interviews",
        queryParams,
      );
      return unwrapRecruitmentItems(res);
    },
    staleTime: 2 * 60_000,
  });
}

export function useCreateInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "recruitment", "interviews", "create"],
    mutationFn: (data: CreateInterviewInput) =>
      apiClient.post<Interview>("/hr/recruitment/interviews", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.interviews() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentStats() });
      qc.invalidateQueries({ queryKey: INTERVIEW_STATS_KEY });
    },
  });
}

export function useUpdateInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "recruitment", "interviews", "update"],
    mutationFn: ({ id, ...data }: UpdateInterviewInput & { id: number }) =>
      apiClient.patch<{ success: boolean }>(`/hr/recruitment/interviews/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.interviews() });
      qc.invalidateQueries({ queryKey: INTERVIEW_STATS_KEY });
    },
  });
}

export function useScorecardTemplates() {
  return useQuery({
    queryKey: queryKeys.hr.scorecardTemplates(),
    queryFn: () => apiClient.get<ScorecardTemplate[]>("/hr/recruitment/scorecard-templates"),
    staleTime: 2 * 60_000,
  });
}

export function useCreateScorecardTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "recruitment", "scorecard-templates", "create"],
    mutationFn: (data: { name: string; criteria: ScorecardCriterion[]; isBlindMode?: boolean }) =>
      apiClient.post<ScorecardTemplate>("/hr/recruitment/scorecard-templates", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.scorecardTemplates() }),
  });
}

export function useUpdateScorecardTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "recruitment", "scorecard-templates", "update"],
    mutationFn: ({ id, ...data }: { id: number; name?: string; criteria?: ScorecardCriterion[] }) =>
      apiClient.patch<{ success: boolean }>(`/hr/recruitment/scorecard-templates/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.scorecardTemplates() }),
  });
}

export function useDeleteScorecardTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "recruitment", "scorecard-templates", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/recruitment/scorecard-templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.scorecardTemplates() }),
  });
}

export function useSubmitScorecard(interviewId: number) {
  const qc = useQueryClient();
  return useMutation({
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
        data
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.interviewScorecard(interviewId) });
      qc.invalidateQueries({ queryKey: queryKeys.hr.interviewScorecardSummary(interviewId) });
    },
  });
}

export function useScheduleInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "recruitment", "interviews", "schedule"],
    mutationFn: (data: ScheduleInterviewInput) =>
      apiClient.post<Interview>("/hr/recruitment/interviews/schedule", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.interviews() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentStats() });
      qc.invalidateQueries({ queryKey: INTERVIEW_STATS_KEY });
    },
  });
}

export function useInterviewSlas() {
  return useQuery({
    queryKey: INTERVIEW_SLAS_KEY,
    queryFn: () => apiClient.get<InterviewSla[]>("/hr/recruitment/interviews/slas"),
    staleTime: 2 * 60_000,
  });
}

export function useUpsertInterviewSla() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "recruitment", "interview-slas", "upsert"],
    mutationFn: (data: { stage: string; maxHours: number; warningHours: number }) =>
      apiClient.put<InterviewSla>("/hr/recruitment/interviews/slas", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: INTERVIEW_SLAS_KEY }),
  });
}

export function useHrSlaReport() {
  return useQuery({
    queryKey: SLA_REPORT_KEY,
    queryFn: () => apiClient.get<HrSlaReport>("/hr/recruitment/interviews/sla-report"),
    staleTime: 2 * 60_000,
  });
}

export function useBulkRescheduleInterviews() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "recruitment", "interviews", "bulk-reschedule"],
    mutationFn: async ({ ids, scheduledAt }: { ids: number[]; scheduledAt: string }) => {
      await Promise.all(
        ids.map((id) =>
          apiClient.patch<{ success: boolean }>(`/hr/recruitment/interviews/${id}`, { scheduledAt })
        )
      );
      return { rescheduled: ids.length };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.interviews() }),
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

  return useQuery({
    queryKey: [...queryKeys.hr.all, "interviewQuestions", filters] as const,
    queryFn: () =>
      apiClient.get<InterviewQuestion[]>(`/hr/interview-questions${qs ? `?${qs}` : ""}`),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useCreateInterviewQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "recruitment", "interview-questions", "create"],
    mutationFn: (data: CreateQuestionInput) =>
      apiClient.post<InterviewQuestion>("/hr/interview-questions", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "interviewQuestions"] }),
  });
}

export function useUpdateInterviewQuestion(questionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "recruitment", "interview-questions", "update", questionId],
    mutationFn: (data: Partial<CreateQuestionInput> & { isActive?: boolean }) =>
      apiClient.patch<{ success: boolean }>(`/hr/interview-questions/${questionId}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "interviewQuestions"] }),
  });
}

export function useDeleteInterviewQuestion(questionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "recruitment", "interview-questions", "delete", questionId],
    mutationFn: () =>
      apiClient.delete<{ success: boolean }>(`/hr/interview-questions/${questionId}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "interviewQuestions"] }),
  });
}

export function useInterviewerPerformance(days = 90) {
  return useQuery<InterviewerPerformanceResponse>({
    queryKey: queryKeys.hr.interviewerPerformance(days),
    queryFn: () =>
      apiClient.get<InterviewerPerformanceResponse>(
        `/hr/recruitment/interviewer-performance?days=${days}`
      ),
    staleTime: 5 * 60 * 1000,
  });
}

export interface HrBookingLink {
  id: number;
  orgId: string;
  candidateId: number;
  jobPostingId: number | null;
  token: string;
  durationMinutes: number;
  interviewType: string;
  status: "pending" | "booked" | "expired" | "cancelled";
  expiresAt: string;
  createdBy: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  candidate: { id: number; firstName: string; lastName: string; email: string } | null;
  jobPosting: { id: number; title: string } | null;
  creator: { id: string; name: string | null } | null;
}

export function useHrBookingLinks() {
  return useQuery({
    queryKey: queryKeys.hr.bookingLinks(),
    queryFn: () => apiClient.get<HrBookingLink[]>("/hr/recruitment/booking-links"),
    staleTime: 2 * 60_000,
  });
}

export function useRevokeBookingLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "recruitment", "booking-links", "revoke"],
    mutationFn: (id: number) =>
      apiClient.patch<{ success: boolean }>(`/hr/recruitment/booking-links/${id}`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.bookingLinks() }),
  });
}

export function useInterviewerAvailability(
  interviewerIds: string[],
  date: string | null
) {
  const enabled = interviewerIds.length > 0 && !!date;
  return useQuery<InterviewerAvailabilityResponse>({
    queryKey: [...queryKeys.hr.all, "interviewerAvailability", date, interviewerIds],
    queryFn: () =>
      apiClient.get<InterviewerAvailabilityResponse>(
        `/hr/recruitment/interviewers/availability?interviewerIds=${interviewerIds.join(",")}&date=${date}`
      ),
    enabled,
    staleTime: 60 * 1000,
  });
}
