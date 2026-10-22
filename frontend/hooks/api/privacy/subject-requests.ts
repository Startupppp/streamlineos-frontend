"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  ExecuteSubjectRequestResult,
  SubjectRequestList,
} from "@/hooks/api/privacy/subject-requests-schema";

const keys = platformCoreQueryKeys.privacy;

const listC = lazyContract(() => import("@/hooks/api/privacy/subject-requests-schema").then((m) => m.subjectRequestListContract));
const executeC = lazyContract(() => import("@/hooks/api/privacy/subject-requests-schema").then((m) => m.executeSubjectRequestContract));

export interface ExecuteSubjectRequestInput {
  kind: "erasure" | "export";
  subjectEmail: string;
  dueBy?: string;
  backupsExpireBy?: string;
}

export function useSubjectRequests(subjectEmail?: string) {
  const params = subjectEmail ? { subjectEmail } : undefined;
  return useGatedQuery("compliance:subject-requests:view", {
    queryKey: keys.subjectRequests(params),
    queryFn: ({ signal }) => apiClient.get<SubjectRequestList>("/compliance/subject-requests", params, signal, listC),
    staleTime: 30_000,
  });
}

export function useExecuteSubjectRequest() {
  const qc = useQueryClient();
  return useAuthorizedMutation<ExecuteSubjectRequestResult, Error, ExecuteSubjectRequestInput>(
    "compliance:subject-requests:execute",
    {
      mutationKey: ["privacy", "subject-requests", "execute"],
      mutationFn: (body) => apiClient.post<ExecuteSubjectRequestResult>("/compliance/subject-requests", body, undefined, executeC),
      onSuccess: () => qc.invalidateQueries({ queryKey: keys.subjectRequests() }),
    },
  );
}
