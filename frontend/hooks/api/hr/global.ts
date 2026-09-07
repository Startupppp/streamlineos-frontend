"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

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

interface CursorResult<T> {
  data: T[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
}

export interface WorkAuthorizationsParams {
  cursor?: string;
  limit?: number;
  employmentId?: number;
  status?: WorkAuthorization["status"];
  days?: number;
}

export interface ComplianceRequirementsParams {
  cursor?: string;
  limit?: number;
  countryCode?: string;
  category?: ComplianceRequirement["category"];
  active?: boolean;
}

export interface ComplianceEventsParams {
  cursor?: string;
  limit?: number;
  requirementId?: number;
  status?: ComplianceEvent["status"];
  from?: string;
  to?: string;
}

export interface ContractsParams {
  cursor?: string;
  limit?: number;
  contractType?: HrContract["contractType"];
  status?: HrContract["status"];
  days?: number;
}

const _listWorkAuthsContract = lazyContract(() =>
  import("@/hooks/api/hr/global-schema").then((m) => m.listWorkAuthsContract),
);
const _createWorkAuthContract = lazyContract(() =>
  import("@/hooks/api/hr/global-schema").then((m) => m.createWorkAuthContract),
);
const _updateWorkAuthContract = lazyContract(() =>
  import("@/hooks/api/hr/global-schema").then((m) => m.updateWorkAuthContract),
);
const _voidContract = lazyContract(() =>
  import("@/hooks/api/hr/global-schema").then((m) => m.voidContract),
);
const _listComplianceRequirementsContract = lazyContract(() =>
  import("@/hooks/api/hr/global-schema").then((m) => m.listComplianceRequirementsContract),
);
const _createComplianceRequirementContract = lazyContract(() =>
  import("@/hooks/api/hr/global-schema").then((m) => m.createComplianceRequirementContract),
);
const _updateComplianceRequirementContract = lazyContract(() =>
  import("@/hooks/api/hr/global-schema").then((m) => m.updateComplianceRequirementContract),
);
const _listComplianceEventsContract = lazyContract(() =>
  import("@/hooks/api/hr/global-schema").then((m) => m.listComplianceEventsContract),
);
const _markEventDoneContract = lazyContract(() =>
  import("@/hooks/api/hr/global-schema").then((m) => m.markEventDoneContract),
);
const _generateEventsContract = lazyContract(() =>
  import("@/hooks/api/hr/global-schema").then((m) => m.generateEventsContract),
);
const _seedCountryPackContract = lazyContract(() =>
  import("@/hooks/api/hr/global-schema").then((m) => m.seedCountryPackContract),
);
const _listContractsContract = lazyContract(() =>
  import("@/hooks/api/hr/global-schema").then((m) => m.listContractsContract),
);
const _createContractContract = lazyContract(() =>
  import("@/hooks/api/hr/global-schema").then((m) => m.createContractContract),
);
const _updateContractContract = lazyContract(() =>
  import("@/hooks/api/hr/global-schema").then((m) => m.updateContractContract),
);
const _endContractContract = lazyContract(() =>
  import("@/hooks/api/hr/global-schema").then((m) => m.endContractContract),
);
const _convertToEmployeeContract = lazyContract(() =>
  import("@/hooks/api/hr/global-schema").then((m) => m.convertToEmployeeContract),
);
const _internshipCertificateContract = lazyContract(() =>
  import("@/hooks/api/hr/global-schema").then((m) => m.internshipCertificateContract),
);

export function useWorkAuthorizations(params?: WorkAuthorizationsParams) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<CursorResult<WorkAuthorization>>({
    queryKey: humanResourcesQueryKeys.hr.workAuthorizations(params as Record<string, unknown>),
    queryFn: ({ signal }) => apiClient.get("/hr/global/work-authorizations", params as Record<string, unknown>, signal, _listWorkAuthsContract),
    staleTime: 60_000,
    enabled: canView && hrEnabled,
  });
}

export function useCreateWorkAuth() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:compliance:manage", {
    mutationKey: ["hr", "global", "workAuth", "create"],
    mutationFn: (body: Record<string, unknown>) => apiClient.post("/hr/global/work-authorizations", body, undefined, _createWorkAuthContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.workAuthorizations() });
      toast.success("Work authorization added");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateWorkAuth(id: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:compliance:manage", {
    mutationKey: ["hr", "global", "workAuth", "update", id],
    mutationFn: (body: Record<string, unknown>) => apiClient.patch(`/hr/global/work-authorizations/${id}`, body, undefined, _updateWorkAuthContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.workAuthorizations() });
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.workAuthorization(id) });
      toast.success("Work authorization updated");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteWorkAuth() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:compliance:manage", {
    mutationKey: ["hr", "global", "workAuth", "delete"],
    mutationFn: (id: number) => apiClient.delete(`/hr/global/work-authorizations/${id}`, undefined, undefined, _voidContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.workAuthorizations() });
      toast.success("Work authorization removed");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useComplianceRequirements(params?: ComplianceRequirementsParams) {
  const canManage = useCan("hr:compliance:manage");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<CursorResult<ComplianceRequirement>>({
    queryKey: humanResourcesQueryKeys.hr.complianceRequirements(params as Record<string, unknown>),
    queryFn: ({ signal }) => apiClient.get("/hr/global/compliance/requirements", params as Record<string, unknown>, signal, _listComplianceRequirementsContract),
    staleTime: 120_000,
    enabled: canManage && hrEnabled,
  });
}

export function useCreateComplianceRequirement() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:compliance:manage", {
    mutationKey: ["hr", "global", "compliance", "create"],
    mutationFn: (body: Record<string, unknown>) => apiClient.post("/hr/global/compliance/requirements", body, undefined, _createComplianceRequirementContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.complianceRequirements() });
      toast.success("Compliance requirement created");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateComplianceRequirement(id: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:compliance:manage", {
    mutationKey: ["hr", "global", "compliance", "update", id],
    mutationFn: (body: Record<string, unknown>) => apiClient.patch(`/hr/global/compliance/requirements/${id}`, body, undefined, _updateComplianceRequirementContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.complianceRequirements() });
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.complianceRequirement(id) });
      toast.success("Compliance requirement updated");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteComplianceRequirement() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:compliance:manage", {
    mutationKey: ["hr", "global", "compliance", "delete"],
    mutationFn: (id: number) => apiClient.delete(`/hr/global/compliance/requirements/${id}`, undefined, undefined, _voidContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.complianceRequirements() });
      toast.success("Compliance requirement deleted");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useComplianceEvents(params?: ComplianceEventsParams) {
  const canManage = useCan("hr:compliance:manage");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<CursorResult<ComplianceEvent>>({
    queryKey: humanResourcesQueryKeys.hr.complianceEvents(params as Record<string, unknown>),
    queryFn: ({ signal }) => apiClient.get("/hr/global/compliance/events", params as Record<string, unknown>, signal, _listComplianceEventsContract),
    staleTime: 60_000,
    enabled: canManage && hrEnabled,
  });
}

export function useMarkEventDone() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:compliance:manage", {
    mutationKey: ["hr", "global", "compliance", "markDone"],
    mutationFn: ({ eventId, notes }: { eventId: number; notes?: string }) =>
      apiClient.post(`/hr/global/compliance/events/${eventId}/done`, { notes }, undefined, _markEventDoneContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.complianceEvents() });
      toast.success("Marked as complete");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useGenerateComplianceEvents() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:compliance:manage", {
    mutationKey: ["hr", "global", "compliance", "generateEvents"],
    mutationFn: (requirementId?: number) =>
      requirementId === undefined
        ? apiClient.post(
            "/hr/global/compliance/generate-events",
            {},
            undefined,
            _generateEventsContract,
          )
        : apiClient.post(
            `/hr/global/compliance/generate-events?requirementId=${requirementId}`,
            {},
            undefined,
            _generateEventsContract,
          ),
    onSuccess: (res: { generated: number }) => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.complianceEvents() });
      toast.success(`Generated ${res.generated} compliance events`);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useSeedCountryPack() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:compliance:manage", {
    mutationKey: ["hr", "global", "compliance", "seedPack"],
    mutationFn: (body: { country: string; year?: number }) =>
      apiClient.post("/hr/global/compliance/seed-country-pack", body, undefined, _seedCountryPackContract),
    onSuccess: (res: { holidays: number; requirements: number; country: string }) => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.complianceRequirements() });
      toast.success(`Seeded ${res.holidays} holidays and ${res.requirements} requirements for ${res.country}`);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useContracts(params?: ContractsParams) {
  const canView = useCan("hr:contracts:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<CursorResult<HrContract>>({
    queryKey: humanResourcesQueryKeys.hr.contracts(params as Record<string, unknown>),
    queryFn: ({ signal }) => apiClient.get("/hr/global/contracts", params as Record<string, unknown>, signal, _listContractsContract),
    staleTime: 60_000,
    enabled: canView && hrEnabled,
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:contracts:manage", {
    mutationKey: ["hr", "global", "contracts", "create"],
    mutationFn: (body: Record<string, unknown>) => apiClient.post("/hr/global/contracts", body, undefined, _createContractContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.contracts() });
      toast.success("Contract created");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateContract(id: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:contracts:manage", {
    mutationKey: ["hr", "global", "contracts", "update", id],
    mutationFn: (body: Record<string, unknown>) => apiClient.patch(`/hr/global/contracts/${id}`, body, undefined, _updateContractContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.contracts() });
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.contract(id) });
      toast.success("Contract updated");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useEndContract() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:contracts:manage", {
    mutationKey: ["hr", "global", "contracts", "end"],
    mutationFn: ({ contractId, notes }: { contractId: number; notes?: string }) =>
      apiClient.post(`/hr/global/contracts/${contractId}/end`, { notes }, undefined, _endContractContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.contracts() });
      toast.success("Contract ended");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useConvertToEmployee() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:contracts:manage", {
    mutationKey: ["hr", "global", "contracts", "convert"],
    mutationFn: ({ contractId, ...body }: { contractId: number; effectiveDate?: string; notes?: string }) =>
      apiClient.post(`/hr/global/contracts/${contractId}/convert-to-employee`, body, undefined, _convertToEmployeeContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.contracts() });
      toast.success("Converted to full-time employee");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useInternshipCertificate(contractId: number, enabled = false) {
  const canView = useCan("hr:contracts:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<{ html: string; templateId: number | null }>({
    queryKey: humanResourcesQueryKeys.hr.internshipCertificate(contractId),
    queryFn: ({ signal }) => apiClient.get(`/hr/global/contracts/${contractId}/internship-certificate`, undefined, signal, _internshipCertificateContract),
    enabled: canView && hrEnabled && enabled,
    staleTime: 300_000,
  });
}
