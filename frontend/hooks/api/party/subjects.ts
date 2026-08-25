"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  CreateSubjectInput,
  CreateSubjectTypeInput,
  LinkPartyInput,
  PartySubjectLink,
  Subject,
  SubjectType,
  SubjectWithParties,
  SubjectsPage,
  UpdateSubjectInput,
} from "@/types/party/subjects";

export interface UseSubjectsParams {
  subjectTypeId?: string;
  search?: string;
  cursor?: string;
  limit?: number;
}

export function useSubjectTypes(options?: { enabled?: boolean }) {
  const canView = useCan("party:subjects:view");

  return useQuery({
    queryKey: queryKeys.party.subjectTypes,
    queryFn: () => apiClient.get<{ data: SubjectType[] }>("/party/subject-types"),
    // A declaration changes when an administrator edits it, which is rare.
    staleTime: 30 * 60_000,
    enabled: canView && (options?.enabled ?? true),
  });
}

export function useSubjects(params: UseSubjectsParams = {}) {
  const canView = useCan("party:subjects:view");
  const { subjectTypeId, search, cursor, limit = 20 } = params;

  return useQuery({
    queryKey: queryKeys.party.subjects({ subjectTypeId, search, cursor, limit }),
    queryFn: () => {
      const searchParams = new URLSearchParams({ limit: String(limit) });
      if (subjectTypeId) searchParams.set("subjectTypeId", subjectTypeId);
      if (search) searchParams.set("search", search);
      if (cursor) searchParams.set("cursor", cursor);
      return apiClient.get<SubjectsPage>(`/party/subjects?${searchParams.toString()}`);
    },
    staleTime: 60_000,
    enabled: canView && !!subjectTypeId,
  });
}

export function useSubject(subjectId: string | null) {
  const canView = useCan("party:subjects:view");

  return useQuery({
    queryKey: queryKeys.party.subject(subjectId ?? ""),
    queryFn: () => apiClient.get<SubjectWithParties>(`/party/subjects/${subjectId}`),
    staleTime: 60_000,
    enabled: canView && !!subjectId,
  });
}

/** The same links a subject carries, read from the party's side. */
export function usePartySubjects(partyId: string | null) {
  const canView = useCan("party:subjects:view");

  return useQuery({
    queryKey: queryKeys.party.partySubjects(partyId ?? ""),
    queryFn: () =>
      apiClient.get<{ data: PartySubjectLink[] }>(`/party/parties/${partyId}/subjects`),
    staleTime: 60_000,
    enabled: canView && !!partyId,
  });
}

export function useCreateSubjectType() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["party", "subject-types", "create"],
    mutationFn: (input: CreateSubjectTypeInput) =>
      apiClient.post<SubjectType>("/party/subject-types", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.party.subjectTypes });
    },
  });
}

export function useUpdateSubjectType() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["party", "subject-types", "update"],
    mutationFn: ({ subjectTypeId, ...input }: CreateSubjectTypeInput & { subjectTypeId: string }) =>
      apiClient.patch<SubjectType>(`/party/subject-types/${subjectTypeId}`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.party.subjectTypes });
      // Every rendered surface for this type is derived from the declaration,
      // so a change to it invalidates the records drawn from it too.
      void qc.invalidateQueries({ queryKey: queryKeys.party.subjects() });
    },
  });
}

export function useDeleteSubjectType() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["party", "subject-types", "delete"],
    mutationFn: (subjectTypeId: string) =>
      apiClient.delete(`/party/subject-types/${subjectTypeId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.party.subjectTypes });
    },
  });
}

export function useCreateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["party", "subjects", "create"],
    mutationFn: (input: CreateSubjectInput) =>
      apiClient.post<Subject>("/party/subjects", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.party.subjects() });
    },
  });
}

export function useUpdateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["party", "subjects", "update"],
    mutationFn: ({ subjectId, ...input }: UpdateSubjectInput & { subjectId: string }) =>
      apiClient.patch<Subject>(`/party/subjects/${subjectId}`, input),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.party.subject(variables.subjectId) });
      void qc.invalidateQueries({ queryKey: queryKeys.party.subjects() });
    },
  });
}

export function useDeleteSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["party", "subjects", "delete"],
    mutationFn: (subjectId: string) => apiClient.delete(`/party/subjects/${subjectId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.party.subjects() });
    },
  });
}

export function useLinkParty() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["party", "subjects", "link"],
    mutationFn: ({ subjectId, ...input }: LinkPartyInput & { subjectId: string }) =>
      apiClient.post(`/party/subjects/${subjectId}/parties`, input),
    onSuccess: (_, variables) => {
      // Both ends of the link are cached separately, so both are invalidated.
      void qc.invalidateQueries({ queryKey: queryKeys.party.subject(variables.subjectId) });
      void qc.invalidateQueries({ queryKey: queryKeys.party.partySubjects(variables.partyId) });
    },
  });
}

export function useUnlinkParty() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["party", "subjects", "unlink"],
    mutationFn: ({ subjectPartyLinkId }: { subjectPartyLinkId: string; subjectId: string }) =>
      apiClient.delete(`/party/subject-links/${subjectPartyLinkId}`),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.party.subject(variables.subjectId) });
      void qc.invalidateQueries({ queryKey: queryKeys.party.all });
    },
  });
}
