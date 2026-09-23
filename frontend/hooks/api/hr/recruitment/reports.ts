"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

const generateReportC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/reports-schema").then((m) => m.generateReportContract),
);
const scheduledReportsListC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/reports-schema").then((m) => m.scheduledReportsListContract),
);
const createScheduledReportC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/reports-schema").then((m) => m.createScheduledReportContract),
);
const deleteScheduledReportC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/reports-schema").then((m) => m.deleteScheduledReportContract),
);
const diversityReportC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/reports-schema").then((m) => m.diversityReportContract),
);

export type ReportEntity = "candidates" | "jobs" | "interviews" | "offers";
export type ReportSchedule = "WEEKLY" | "MONTHLY";

export interface ReportFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  departmentId?: number;
}

export interface ReportConfig {
  entity: ReportEntity;
  fields: string[];
  filters: ReportFilters;
}

export interface GenerateReportResult {
  rows: Record<string, unknown>[];
  entity: ReportEntity;
  fields: string[];
  total: number;
}

export interface ScheduledReport {
  id: number;
  name: string;
  reportConfig: { entity: string; fields: string[]; filters?: Record<string, unknown> };
  schedule: string;
  recipients: string[];
  lastRunAt: string | null;
  createdAt: string;
}

export interface CreateScheduledReportInput {
  name: string;
  reportConfig: ReportConfig;
  schedule: ReportSchedule;
  recipients: string[];
}

export function useGenerateReport() {
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["hr", "recruitment", "reports", "generate"],
    mutationFn: (config: ReportConfig) =>
      apiClient.post<GenerateReportResult>("/hr/recruitment/reports/generate", config, undefined, generateReportC),
  });
}

export function useScheduledReports() {
  return useGatedQuery("hr:interviews:view", {
    queryKey: humanResourcesQueryKeys.hr.scheduledReports(),
    queryFn: ({ signal }) => apiClient.get<ScheduledReport[]>("/hr/recruitment/reports/scheduled", undefined, signal, scheduledReportsListC),
    staleTime: 5 * 60_000,
  });
}

export function useCreateScheduledReport() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["hr", "recruitment", "reports", "create-scheduled"],
    mutationFn: (data: CreateScheduledReportInput) =>
      apiClient.post<ScheduledReport>("/hr/recruitment/reports/scheduled", data, undefined, createScheduledReportC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.scheduledReports() });
    },
  });
}

export function useDeleteScheduledReport() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["hr", "recruitment", "reports", "delete-scheduled"],
    mutationFn: (scheduledId: number) => apiClient.delete(`/hr/recruitment/reports/scheduled/${scheduledId}`, undefined, undefined, deleteScheduledReportC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.scheduledReports() });
    },
  });
}

export const ENTITY_FIELDS: Record<ReportEntity, { value: string; label: string }[]> = {
  candidates: [
    { value: "id", label: "ID" },
    { value: "firstName", label: "First Name" },
    { value: "lastName", label: "Last Name" },
    { value: "email", label: "Email" },
    { value: "phone", label: "Phone" },
    { value: "status", label: "Status" },
    { value: "source", label: "Source" },
    { value: "currentCompany", label: "Current Company" },
    { value: "currentRole", label: "Current Role" },
    { value: "experienceYears", label: "Experience (Years)" },
    { value: "rating", label: "Rating" },
    { value: "aiScore", label: "AI Score" },
    { value: "location", label: "Location" },
    { value: "gender", label: "Gender" },
    { value: "createdAt", label: "Created At" },
  ],
  jobs: [
    { value: "id", label: "ID" },
    { value: "title", label: "Title" },
    { value: "status", label: "Status" },
    { value: "type", label: "Type" },
    { value: "location", label: "Location" },
    { value: "openings", label: "Openings" },
    { value: "salaryMin", label: "Salary Min" },
    { value: "salaryMax", label: "Salary Max" },
    { value: "createdAt", label: "Created At" },
    { value: "applicationDeadline", label: "Deadline" },
  ],
  interviews: [
    { value: "id", label: "ID" },
    { value: "type", label: "Type" },
    { value: "scheduledAt", label: "Scheduled At" },
    { value: "result", label: "Result" },
    { value: "rating", label: "Rating" },
    { value: "duration", label: "Duration (min)" },
    { value: "location", label: "Location" },
    { value: "createdAt", label: "Created At" },
  ],
  offers: [
    { value: "id", label: "ID" },
    { value: "offerStatus", label: "Status" },
    { value: "offeredSalary", label: "Salary" },
    { value: "offeredDesignation", label: "Designation" },
    { value: "joiningDate", label: "Joining Date" },
    { value: "validUntil", label: "Valid Until" },
    { value: "sentAt", label: "Sent At" },
    { value: "respondedAt", label: "Responded At" },
    { value: "createdAt", label: "Created At" },
  ],
};

export interface DiversityReport {
  total: number;
  genderBreakdown: { gender: string; count: number }[];
  locationBreakdown: { location: string; count: number }[];
  sourceBreakdown: { source: string; count: number }[];
  stageBreakdown: { stage: string; count: number }[];
}

export interface DiversityFilters {
  from: string;
  to: string;
  departmentIds: string[];
}

export function useDiversityReport(filters: DiversityFilters) {
  const params: Record<string, string> = {};
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.departmentIds.length > 0) params.departmentIds = filters.departmentIds.join(",");

  return useGatedQuery<DiversityReport>("hr:sensitive:view", {
    queryKey: [...humanResourcesQueryKeys.hr.diversityReport(), params],
    queryFn: ({ signal }) => apiClient.get<DiversityReport>("/hr/recruitment/diversity-report", params, signal, diversityReportC),
    staleTime: 5 * 60_000,
  });
}
