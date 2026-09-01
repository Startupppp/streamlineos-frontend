"use client";

import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";

export type CaseCategory =
  | "grievance" | "disciplinary" | "harassment" | "ethics"
  | "performance" | "workplace_conflict" | "policy_violation" | "other";
export type CaseSeverity = "low" | "medium" | "high" | "critical";
export type CaseStatus = "open" | "under_investigation" | "resolved" | "closed" | "dismissed";
export type DisciplinaryActionType =
  | "verbal_warning" | "written_warning" | "final_warning"
  | "suspension" | "termination_recommended";

export interface HrCase {
  id: number;
  caseNumber: string;
  category: CaseCategory;
  severity: CaseSeverity;
  status: CaseStatus;
  summary: string;
  anonymous: boolean;
  confidential: boolean;
  assignedTo: string | null;
  subjectEmployeeId: string | null;
  reportedBy: string | null;
  details: string;
  outcome: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaseNote {
  id: number;
  caseId: number;
  authorId: string | null;
  note: string;
  isConfidential: boolean;
  createdAt: string;
}

export interface CaseDocument {
  id: number;
  caseId: number;
  name: string;
  url: string;
  restricted: boolean;
  uploadedBy: string | null;
  createdAt: string;
}

export interface DisciplinaryAction {
  id: number;
  orgId: string;
  caseId: number | null;
  employeeId: string;
  actionType: DisciplinaryActionType;
  letterRenderId: number | null;
  effectiveDate: string;
  issuedBy: string;
  note: string | null;
  createdAt: string;
}

interface CursorResult<T> {
  data: T[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
}

export interface ListCasesParams {
  cursor?: string;
  limit?: number;
  status?: CaseStatus;
  category?: CaseCategory;
  severity?: CaseSeverity;
  search?: string;
  assignedTo?: string;
}

const caseKeys = {
  all: ["streamlineos", "hr", "cases"] as const,
  list: (params: ListCasesParams) => ["streamlineos", "hr", "cases", "list", params] as const,
  detail: (id: number) => ["streamlineos", "hr", "cases", "detail", id] as const,
  notes: (id: number) => ["streamlineos", "hr", "cases", "notes", id] as const,
  documents: (id: number) => ["streamlineos", "hr", "cases", "documents", id] as const,
  stats: ["streamlineos", "hr", "cases", "stats"] as const,
  disciplinary: ["streamlineos", "hr", "disciplinary"] as const,
  disciplinaryList: (params: Record<string, unknown>) => ["streamlineos", "hr", "disciplinary", "list", params] as const,
};

export function useHrCases(params: ListCasesParams = {}) {
  const canCases = useCan("hr:cases:view");
  return useQuery({
    queryKey: caseKeys.list(params),
    queryFn: () => apiClient.get<CursorResult<HrCase>>("/hr/cases", params as Record<string, unknown>),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    enabled: canCases,
  });
}

export function useHrCase(id: number) {
  return useQuery({
    queryKey: caseKeys.detail(id),
    queryFn: () => apiClient.get<HrCase>(`/hr/cases/${id}`),
    enabled: id > 0,
    staleTime: 30_000,
  });
}

export function useCreateCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-cases", "create"],
    mutationFn: (body: {
      category: CaseCategory;
      subjectEmployeeId?: string;
      severity: CaseSeverity;
      summary: string;
      details: string;
      assignedTo?: string;
      confidential?: boolean;
    }) => apiClient.post<HrCase>("/hr/cases", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: caseKeys.all });
      toast.success("Case created");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useAnonymousReport() {
  return useMutation({
    mutationKey: ["hr-cases", "anonymous"],
    mutationFn: (body: {
      category: CaseCategory;
      severity: CaseSeverity;
      summary: string;
      details: string;
    }) => apiClient.post<{ caseNumber: string }>("/hr/cases/anonymous", body),
    onSuccess: () => toast.success("Anonymous report submitted"),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useUpdateCase(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-cases", "update", id],
    mutationFn: (body: Partial<{
      status: CaseStatus;
      severity: CaseSeverity;
      assignedTo: string | null;
      outcome: string;
      summary: string;
      details: string;
      confidential: boolean;
    }>) => apiClient.patch<HrCase>(`/hr/cases/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: caseKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: caseKeys.all });
      toast.success("Case updated");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useStartInvestigation(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-cases", "investigate", id],
    mutationFn: () => apiClient.post<HrCase>(`/hr/cases/${id}/investigate`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: caseKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: caseKeys.all });
      toast.success("Investigation started");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useCaseNotes(caseId: number) {
  return useQuery({
    queryKey: caseKeys.notes(caseId),
    queryFn: () => apiClient.get<CaseNote[]>(`/hr/cases/${caseId}/notes`),
    enabled: caseId > 0,
    staleTime: 20_000,
  });
}

export function useAddCaseNote(caseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-cases", "notes", "add", caseId],
    mutationFn: (body: { note: string; isConfidential?: boolean }) =>
      apiClient.post<CaseNote>(`/hr/cases/${caseId}/notes`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: caseKeys.notes(caseId) });
      toast.success("Note added");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useCaseDocuments(caseId: number) {
  return useQuery({
    queryKey: caseKeys.documents(caseId),
    queryFn: () => apiClient.get<CaseDocument[]>(`/hr/cases/${caseId}/documents`),
    enabled: caseId > 0,
    staleTime: 30_000,
  });
}

export function useDisciplinaryActions(params: { employeeId?: string; cursor?: string; limit?: number; actionType?: string } = {}) {
  return useQuery({
    queryKey: caseKeys.disciplinaryList(params),
    queryFn: () => apiClient.get<CursorResult<DisciplinaryAction>>("/hr/cases/disciplinary", params as Record<string, unknown>),
    staleTime: 30_000,
  });
}

export function useCreateDisciplinaryAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-disciplinary", "create"],
    mutationFn: (body: {
      caseId?: number;
      employeeId: string;
      actionType: DisciplinaryActionType;
      effectiveDate: string;
      note?: string;
      generateLetter?: boolean;
      letterTemplateId?: number;
      letterContext?: Record<string, string>;
      forceEscalate?: boolean;
    }) => apiClient.post<DisciplinaryAction>("/hr/cases/disciplinary", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: caseKeys.disciplinary });
      toast.success("Disciplinary action issued");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useMyDisciplinaryActions() {
  return useQuery({
    queryKey: [...caseKeys.disciplinary, "mine"] as const,
    queryFn: () =>
      apiClient.get<
        Array<{
          id: number;
          actionType: DisciplinaryActionType;
          effectiveDate: string;
          note: string | null;
          caseId: number | null;
          acknowledgedAt: string | null;
          createdAt: string;
        }>
      >("/hr/cases/disciplinary/mine"),
    staleTime: 60_000,
  });
}

export function useAcknowledgeDisciplinaryAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-disciplinary", "acknowledge"],
    mutationFn: ({ id, note }: { id: number; note?: string }) =>
      apiClient.post(`/hr/cases/disciplinary/${id}/acknowledge`, { note }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: caseKeys.disciplinary });
      toast.success("Acknowledged");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}
