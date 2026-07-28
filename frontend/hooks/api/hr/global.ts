"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

export interface WorkAuthorization {
  id: number;
  orgId: string;
  employmentId: number;
  authType: "work_permit" | "visa" | "right_to_work" | "citizenship_proof" | "other";
  countryCode: string;
  documentNumberMasked: string | null;
  validFrom: string | null;
  validUntil: string | null;
  status: "active" | "expiring" | "expired" | "pending_renewal";
  verifiedBy: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceRequirement {
  id: number;
  orgId: string;
  name: string;
  countryCode: string | null;
  stateCode: string | null;
  category: "statutory_filing" | "registration" | "posting" | "training" | "audit" | "other";
  frequency: "once" | "monthly" | "quarterly" | "yearly";
  dueRule: { month?: number; day?: number; offsetDays?: number };
  reminderDaysBefore: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceEvent {
  id: number;
  orgId: string;
  requirementId: number;
  requirementName: string | null;
  category: string | null;
  reminderDaysBefore: number | null;
  dueDate: string;
  status: "pending" | "done" | "overdue";
  completedBy: string | null;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HrContract {
  id: number;
  orgId: string;
  employmentId: number;
  contractType: "contractor" | "consultant" | "intern" | "temporary" | "agency" | "freelancer";
  agencyVendor: string | null;
  startDate: string;
  endDate: string | null;
  renewalReminderDays: number;
  stipendCents: number | null;
  timesheetBased: boolean;
  status: "active" | "expiring" | "ended" | "renewed" | "converted";
  documentUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export function useWorkAuthorizations(params?: Record<string, unknown>) {
  return useQuery<PaginatedResponse<WorkAuthorization>>({
    queryKey: queryKeys.hr.workAuthorizations(params),
    queryFn: () => apiClient.get("/hr/global/work-authorizations", params),
    staleTime: 60_000,
  });
}

export function useWorkAuthorization(id: number) {
  return useQuery<WorkAuthorization>({
    queryKey: queryKeys.hr.workAuthorization(id),
    queryFn: () => apiClient.get(`/hr/global/work-authorizations/${id}`),
    staleTime: 60_000,
  });
}

export function useCreateWorkAuth() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "global", "workAuth", "create"],
    mutationFn: (body: Record<string, unknown>) => apiClient.post("/hr/global/work-authorizations", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.workAuthorizations() });
      toast.success("Work authorization added");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateWorkAuth(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "global", "workAuth", "update", id],
    mutationFn: (body: Record<string, unknown>) => apiClient.patch(`/hr/global/work-authorizations/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.workAuthorizations() });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.workAuthorization(id) });
      toast.success("Work authorization updated");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteWorkAuth() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "global", "workAuth", "delete"],
    mutationFn: (id: number) => apiClient.delete(`/hr/global/work-authorizations/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.workAuthorizations() });
      toast.success("Work authorization removed");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useComplianceRequirements(params?: Record<string, unknown>) {
  return useQuery<PaginatedResponse<ComplianceRequirement>>({
    queryKey: queryKeys.hr.complianceRequirements(params),
    queryFn: () => apiClient.get("/hr/global/compliance/requirements", params),
    staleTime: 120_000,
  });
}

export function useComplianceRequirement(id: number) {
  return useQuery<ComplianceRequirement>({
    queryKey: queryKeys.hr.complianceRequirement(id),
    queryFn: () => apiClient.get(`/hr/global/compliance/requirements/${id}`),
    staleTime: 120_000,
  });
}

export function useCreateComplianceRequirement() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "global", "compliance", "create"],
    mutationFn: (body: Record<string, unknown>) => apiClient.post("/hr/global/compliance/requirements", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.complianceRequirements() });
      toast.success("Compliance requirement created");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateComplianceRequirement(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "global", "compliance", "update", id],
    mutationFn: (body: Record<string, unknown>) => apiClient.patch(`/hr/global/compliance/requirements/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.complianceRequirements() });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.complianceRequirement(id) });
      toast.success("Compliance requirement updated");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteComplianceRequirement() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "global", "compliance", "delete"],
    mutationFn: (id: number) => apiClient.delete(`/hr/global/compliance/requirements/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.complianceRequirements() });
      toast.success("Compliance requirement deleted");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useComplianceEvents(params?: Record<string, unknown>) {
  return useQuery<PaginatedResponse<ComplianceEvent>>({
    queryKey: queryKeys.hr.complianceEvents(params),
    queryFn: () => apiClient.get("/hr/global/compliance/events", params),
    staleTime: 60_000,
  });
}

export function useMarkEventDone() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "global", "compliance", "markDone"],
    mutationFn: ({ eventId, notes }: { eventId: number; notes?: string }) =>
      apiClient.post(`/hr/global/compliance/events/${eventId}/done`, { notes }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.complianceEvents() });
      toast.success("Marked as complete");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useGenerateComplianceEvents() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "global", "compliance", "generateEvents"],
    mutationFn: (requirementId?: number) =>
      apiClient.post<{ generated: number }>(`/hr/global/compliance/generate-events${requirementId ? `?requirementId=${requirementId}` : ""}`, {}),
    onSuccess: (res: { generated: number }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.complianceEvents() });
      toast.success(`Generated ${res.generated} compliance events`);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useSeedCountryPack() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "global", "compliance", "seedPack"],
    mutationFn: (body: { country: string; year?: number }) =>
      apiClient.post<{ holidays: number; requirements: number; country: string }>("/hr/global/compliance/seed-country-pack", body),
    onSuccess: (res: { holidays: number; requirements: number; country: string }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.complianceRequirements() });
      toast.success(`Seeded ${res.holidays} holidays and ${res.requirements} requirements for ${res.country}`);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useContracts(params?: Record<string, unknown>) {
  return useQuery<PaginatedResponse<HrContract>>({
    queryKey: queryKeys.hr.contracts(params),
    queryFn: () => apiClient.get("/hr/global/contracts", params),
    staleTime: 60_000,
  });
}

export function useContract(id: number) {
  return useQuery<HrContract>({
    queryKey: queryKeys.hr.contract(id),
    queryFn: () => apiClient.get(`/hr/global/contracts/${id}`),
    staleTime: 60_000,
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "global", "contracts", "create"],
    mutationFn: (body: Record<string, unknown>) => apiClient.post("/hr/global/contracts", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.contracts() });
      toast.success("Contract created");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateContract(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "global", "contracts", "update", id],
    mutationFn: (body: Record<string, unknown>) => apiClient.patch(`/hr/global/contracts/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.contracts() });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.contract(id) });
      toast.success("Contract updated");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useEndContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "global", "contracts", "end"],
    mutationFn: ({ contractId, notes }: { contractId: number; notes?: string }) =>
      apiClient.post(`/hr/global/contracts/${contractId}/end`, { notes }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.contracts() });
      toast.success("Contract ended");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useConvertToEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "global", "contracts", "convert"],
    mutationFn: ({ contractId, ...body }: { contractId: number; effectiveDate?: string; notes?: string }) =>
      apiClient.post(`/hr/global/contracts/${contractId}/convert-to-employee`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.contracts() });
      toast.success("Converted to full-time employee");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useInternshipCertificate(contractId: number, enabled = false) {
  return useQuery<{ html: string; templateId: number | null }>({
    queryKey: queryKeys.hr.internshipCertificate(contractId),
    queryFn: () => apiClient.get(`/hr/global/contracts/${contractId}/internship-certificate`),
    enabled,
    staleTime: 300_000,
  });
}
