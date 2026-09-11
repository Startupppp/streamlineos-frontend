"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { queryKeyBase } from "@/lib/query-keys/base";
import { useGatedQuery } from "@/hooks/api/gated-query";

const hrCaseListLazy = lazyContract(() =>
  import("@/hooks/api/hr/cases-schema").then((m) => m.hrCaseListContract),
);
const hrCaseLazy = lazyContract(() =>
  import("@/hooks/api/hr/cases-schema").then((m) => m.hrCaseContract),
);
const anonymousCaseLazy = lazyContract(() =>
  import("@/hooks/api/hr/cases-schema").then((m) => m.anonymousCaseContract),
);
const hrCaseNotesLazy = lazyContract(() =>
  import("@/hooks/api/hr/cases-schema").then((m) => m.hrCaseNotesContract),
);
const hrCaseNoteLazy = lazyContract(() =>
  import("@/hooks/api/hr/cases-schema").then((m) => m.hrCaseNoteContract),
);
const hrCaseDocumentsLazy = lazyContract(() =>
  import("@/hooks/api/hr/cases-schema").then((m) => m.hrCaseDocumentsContract),
);
const hrDisciplinaryListLazy = lazyContract(() =>
  import("@/hooks/api/hr/cases-schema").then((m) => m.hrDisciplinaryListContract),
);
const hrDisciplinaryCreateLazy = lazyContract(() =>
  import("@/hooks/api/hr/cases-schema").then((m) => m.hrDisciplinaryCreateContract),
);
const hrDisciplinaryActionLazy = lazyContract(() =>
  import("@/hooks/api/hr/cases-schema").then((m) => m.hrDisciplinaryActionContract),
);

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
  all: [...queryKeyBase, "hr", "cases"] as const,
  list: (params: ListCasesParams) => [...queryKeyBase, "hr", "cases", "list", params] as const,
  detail: (id: number) => [...queryKeyBase, "hr", "cases", "detail", id] as const,
  notes: (id: number) => [...queryKeyBase, "hr", "cases", "notes", id] as const,
  documents: (id: number) => [...queryKeyBase, "hr", "cases", "documents", id] as const,
  stats: [...queryKeyBase, "hr", "cases", "stats"] as const,
  disciplinary: [...queryKeyBase, "hr", "disciplinary"] as const,
  disciplinaryMine: [...queryKeyBase, "hr", "disciplinary", "mine"] as const,
  disciplinaryList: (params: Record<string, unknown>) => [...queryKeyBase, "hr", "disciplinary", "list", params] as const,
};

export function useHrCases(params: ListCasesParams = {}) {
  const canCases = useCan("hr:cases:view");
  return useQuery({
    queryKey: caseKeys.list(params),
    queryFn: ({ signal }) => apiClient.get<CursorResult<HrCase>>("/hr/cases", params, signal, hrCaseListLazy),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    enabled: canCases,
  });
}

export function useHrCase(id: number) {
  return useGatedQuery("hr:cases:view", {
    queryKey: caseKeys.detail(id),
    queryFn: ({ signal }) => apiClient.get<HrCase>(`/hr/cases/${id}`, undefined, signal, hrCaseLazy),
    enabled: id > 0,
    staleTime: 30_000,
  });
}

export function useCreateCase() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:cases:manage", {
    mutationKey: ["hr-cases", "create"],
    mutationFn: (body: {
      category: CaseCategory;
      subjectEmployeeId?: string;
      severity: CaseSeverity;
      summary: string;
      details: string;
      assignedTo?: string;
      confidential?: boolean;
    }) => apiClient.post<HrCase>("/hr/cases", body, undefined, hrCaseLazy),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: caseKeys.all });
      toast.success("Case created");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useAnonymousReport() {
  return useAuthorizedMutation("hr:cases:view", {
    mutationKey: ["hr-cases", "anonymous"],
    mutationFn: (body: {
      category: CaseCategory;
      severity: CaseSeverity;
      summary: string;
      details: string;
    }) => apiClient.post<{ caseNumber: string }>("/hr/cases/anonymous", body, undefined, anonymousCaseLazy),
    onSuccess: () => toast.success("Anonymous report submitted"),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useUpdateCase(id: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:cases:manage", {
    mutationKey: ["hr-cases", "update", id],
    mutationFn: (body: Partial<{
      status: CaseStatus;
      severity: CaseSeverity;
      assignedTo: string | null;
      outcome: string;
      summary: string;
      details: string;
      confidential: boolean;
    }>) => apiClient.patch<HrCase>(`/hr/cases/${id}`, body, undefined, hrCaseLazy),
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
  return useAuthorizedMutation("hr:cases:manage", {
    mutationKey: ["hr-cases", "investigate", id],
    mutationFn: () => apiClient.post<HrCase>(`/hr/cases/${id}/investigate`, {}, undefined, hrCaseLazy),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: caseKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: caseKeys.all });
      toast.success("Investigation started");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useCaseNotes(caseId: number) {
  return useGatedQuery("hr:cases:view", {
    queryKey: caseKeys.notes(caseId),
    queryFn: ({ signal }) => apiClient.get<CaseNote[]>(`/hr/cases/${caseId}/notes`, undefined, signal, hrCaseNotesLazy),
    enabled: caseId > 0,
    staleTime: 20_000,
  });
}

export function useAddCaseNote(caseId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:cases:manage", {
    mutationKey: ["hr-cases", "notes", "add", caseId],
    mutationFn: (body: { note: string; isConfidential?: boolean }) =>
      apiClient.post<CaseNote>(`/hr/cases/${caseId}/notes`, body, undefined, hrCaseNoteLazy),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: caseKeys.notes(caseId) });
      toast.success("Note added");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useCaseDocuments(caseId: number) {
  return useGatedQuery("hr:cases:view", {
    queryKey: caseKeys.documents(caseId),
    queryFn: ({ signal }) => apiClient.get<CaseDocument[]>(`/hr/cases/${caseId}/documents`, undefined, signal, hrCaseDocumentsLazy),
    enabled: caseId > 0,
    staleTime: 30_000,
  });
}

export function useDisciplinaryActions(params: { employeeId?: string; cursor?: string; limit?: number; actionType?: string } = {}) {
  return useGatedQuery("hr:cases:view", {
    queryKey: caseKeys.disciplinaryList(params),
    queryFn: ({ signal }) => apiClient.get<CursorResult<DisciplinaryAction>>("/hr/cases/disciplinary", params, signal, hrDisciplinaryListLazy),
    staleTime: 30_000,
  });
}

export function useCreateDisciplinaryAction() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:cases:manage", {
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
    }) => apiClient.post<DisciplinaryAction>("/hr/cases/disciplinary", body, undefined, hrDisciplinaryCreateLazy),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: caseKeys.disciplinary });
      toast.success("Disciplinary action issued");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useMyDisciplinaryActions() {
  return useGatedQuery("self:cases", {
    queryKey: caseKeys.disciplinaryMine,
    queryFn: ({ signal }) =>
      apiClient.get<CursorResult<DisciplinaryAction>>(
        "/hr/cases/disciplinary/mine",
        undefined,
        signal,
        hrDisciplinaryListLazy,
      ),
    staleTime: 60_000,
  });
}

export function useAcknowledgeDisciplinaryAction() {
  const qc = useQueryClient();
  return useAuthorizedMutation("self:cases", {
    mutationKey: ["hr-disciplinary", "acknowledge"],
    mutationFn: ({ id, note }: { id: number; note?: string }) =>
      apiClient.post<DisciplinaryAction>(`/hr/cases/disciplinary/${id}/acknowledge`, { note }, undefined, hrDisciplinaryActionLazy),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: caseKeys.disciplinary });
      toast.success("Acknowledged");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}
