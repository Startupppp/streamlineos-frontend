"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
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
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";

const subjectTypeListContract = lazyContract(() =>
  import("@/hooks/api/party/party-schema").then((m) => m.subjectTypeListContract),
);
const subjectTypeMutationContract = lazyContract(() =>
  import("@/hooks/api/party/party-schema").then((m) => m.subjectTypeMutationContract),
);
const subjectTypeDeleteContract = lazyContract(() =>
  import("@/hooks/api/party/party-schema").then((m) => m.subjectTypeDeleteContract),
);
const subjectListContract = lazyContract(() =>
  import("@/hooks/api/party/party-schema").then((m) => m.subjectListContract),
);
const subjectDetailContract = lazyContract(() =>
  import("@/hooks/api/party/party-schema").then((m) => m.subjectDetailContract),
);
const subjectMutationContract = lazyContract(() =>
  import("@/hooks/api/party/party-schema").then((m) => m.subjectMutationContract),
);
const subjectLinkContract = lazyContract(() =>
  import("@/hooks/api/party/party-schema").then((m) => m.subjectLinkContract),
);
const subjectUnlinkContract = lazyContract(() =>
  import("@/hooks/api/party/party-schema").then((m) => m.subjectUnlinkContract),
);
const partySubjectsContract = lazyContract(() =>
  import("@/hooks/api/party/party-schema").then((m) => m.partySubjectsContract),
);

export interface UseSubjectsParams {
  subjectTypeId?: string;
  search?: string;
  cursor?: string;
  limit?: number;
}

export function useSubjectTypes(options?: { enabled?: boolean }) {
  const canView = useCan("party:subjects:view");

  return useQuery({
    queryKey: directoryAndOwnershipQueryKeys.party.subjectTypes,
    queryFn: ({ signal }) =>
      apiClient.get<{ data: SubjectType[] }>(
        "/party/subject-types",
        undefined,
        signal,
        subjectTypeListContract,
      ),
    // A declaration changes when an administrator edits it, which is rare.
    staleTime: 30 * 60_000,
    enabled: canView && (options?.enabled ?? true),
  });
}

export function useSubjects(params: UseSubjectsParams = {}) {
  const canView = useCan("party:subjects:view");
  const { subjectTypeId, search, cursor, limit = 20 } = params;

  return useQuery({
    queryKey: directoryAndOwnershipQueryKeys.party.subjects({
      subjectTypeId,
      search,
      cursor,
      limit,
    }),
    queryFn: ({ signal }) => {
      const searchParams = new URLSearchParams({ limit: String(limit) });
      if (subjectTypeId) searchParams.set("subjectTypeId", subjectTypeId);
      if (search) searchParams.set("search", search);
      if (cursor) searchParams.set("cursor", cursor);
      return apiClient.get<SubjectsPage>(
        `/party/subjects?${searchParams.toString()}`,
        undefined,
        signal,
        subjectListContract,
      );
    },
    staleTime: 60_000,
    enabled: canView && !!subjectTypeId,
  });
}

export function useSubject(subjectId: string | null) {
  const canView = useCan("party:subjects:view");

  return useQuery({
    queryKey: directoryAndOwnershipQueryKeys.party.subject(subjectId ?? ""),
    queryFn: ({ signal }) =>
      apiClient.get<SubjectWithParties>(
        `/party/subjects/${subjectId}`,
        undefined,
        signal,
        subjectDetailContract,
      ),
    staleTime: 60_000,
    enabled: canView && !!subjectId,
  });
}

/** The same links a subject carries, read from the party's side. */
export function usePartySubjects(partyId: string | null) {
  const canView = useCan("party:subjects:view");

  return useQuery({
    queryKey: directoryAndOwnershipQueryKeys.party.partySubjects(partyId ?? ""),
    queryFn: ({ signal }) =>
      apiClient.get<{ data: PartySubjectLink[] }>(
        `/party/parties/${partyId}/subjects`,
        undefined,
        signal,
        partySubjectsContract,
      ),
    staleTime: 60_000,
    enabled: canView && !!partyId,
  });
}

export function useCreateSubjectType() {
  const qc = useQueryClient();
  return useAuthorizedMutation("party:subject-types:manage", {
    mutationKey: ["party", "subject-types", "create"],
    mutationFn: (input: CreateSubjectTypeInput) =>
      apiClient.post<SubjectType>("/party/subject-types", input, undefined, subjectTypeMutationContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.party.subjectTypes });
    },
  });
}

export function useUpdateSubjectType() {
  const qc = useQueryClient();
  return useAuthorizedMutation("party:subject-types:manage", {
    mutationKey: ["party", "subject-types", "update"],
    mutationFn: ({
      subjectTypeId,
      ...input
    }: CreateSubjectTypeInput & { subjectTypeId: string }) =>
      apiClient.patch<SubjectType>(
        `/party/subject-types/${subjectTypeId}`,
        input,
        undefined,
        subjectTypeMutationContract,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.party.subjectTypes });
      // Every rendered surface for this type is derived from the declaration,
      // so a change to it invalidates the records drawn from it too.
      void qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.party.subjects() });
    },
  });
}

export function useDeleteSubjectType() {
  const qc = useQueryClient();
  return useAuthorizedMutation("party:subject-types:manage", {
    mutationKey: ["party", "subject-types", "delete"],
    mutationFn: (subjectTypeId: string) =>
      apiClient.delete<{ deleted: true }>(
        `/party/subject-types/${subjectTypeId}`,
        undefined,
        undefined,
        subjectTypeDeleteContract,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.party.subjectTypes });
    },
  });
}

export function useCreateSubject() {
  const qc = useQueryClient();
  return useAuthorizedMutation("party:subjects:manage", {
    mutationKey: ["party", "subjects", "create"],
    mutationFn: (input: CreateSubjectInput) =>
      apiClient.post<Subject>("/party/subjects", input, undefined, subjectMutationContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.party.subjects() });
    },
  });
}

export function useUpdateSubject() {
  const qc = useQueryClient();
  return useAuthorizedMutation("party:subjects:manage", {
    mutationKey: ["party", "subjects", "update"],
    mutationFn: ({
      subjectId,
      ...input
    }: UpdateSubjectInput & { subjectId: string }) =>
      apiClient.patch<Subject>(`/party/subjects/${subjectId}`, input, undefined, subjectMutationContract),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({
        queryKey: directoryAndOwnershipQueryKeys.party.subject(variables.subjectId),
      });
      void qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.party.subjects() });
    },
  });
}

export function useLinkParty() {
  const qc = useQueryClient();
  return useAuthorizedMutation("party:subjects:manage", {
    mutationKey: ["party", "subjects", "link"],
    mutationFn: ({
      subjectId,
      ...input
    }: LinkPartyInput & { subjectId: string }) =>
      apiClient.post(
        `/party/subjects/${subjectId}/parties`,
        input,
        undefined,
        subjectLinkContract,
      ),
    onSuccess: (_, variables) => {
      // Both ends of the link are cached separately, so both are invalidated.
      void qc.invalidateQueries({
        queryKey: directoryAndOwnershipQueryKeys.party.subject(variables.subjectId),
      });
      void qc.invalidateQueries({
        queryKey: directoryAndOwnershipQueryKeys.party.partySubjects(variables.partyId),
      });
    },
  });
}

export function useUnlinkParty() {
  const qc = useQueryClient();
  return useAuthorizedMutation("party:subjects:manage", {
    mutationKey: ["party", "subjects", "unlink"],
    mutationFn: ({
      subjectPartyLinkId,
    }: {
      subjectPartyLinkId: string;
      subjectId: string;
    }) =>
      apiClient.delete<{ unlinked: true }>(
        `/party/subject-links/${subjectPartyLinkId}`,
        undefined,
        undefined,
        subjectUnlinkContract,
      ),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({
        queryKey: directoryAndOwnershipQueryKeys.party.subject(variables.subjectId),
      });
      void qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.party.all });
    },
  });
}
