"use client";
import type { z } from "zod";
import type { myOnboardingDocsContract as onboardingDocListContractDef } from "@/hooks/api/hr/onboarding-schema";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { onboardingDocsSummaryQueryOptions } from "./document-review-read-options";

const onboardingDocListLazy = lazyContract(() =>
  import("@/hooks/api/hr/document-review-schema").then((m) => m.onboardingDocListContract),
);
const onboardingDocRowLazy = lazyContract(() =>
  import("@/hooks/api/hr/document-review-schema").then((m) => m.onboardingDocRowContract),
);

const REVIEW_DOCS_PAGE_SIZE = 20;

function hrOnboardingDocAdminListQueryOptions(params?: { limit?: number; cursor?: string; userId?: string }) {
  const normalized = {
    limit: params?.limit ?? REVIEW_DOCS_PAGE_SIZE,
    ...(params?.cursor ? { cursor: params.cursor } : {}),
    ...(params?.userId ? { userId: params.userId } : {}),
  };
  return {
    queryKey: humanResourcesQueryKeys.hr.onboardingDocs(normalized),
    staleTime: 30_000,
  } as const;
}

export type EmployeeOnboardingDoc = z.infer<typeof onboardingDocListContractDef>["data"][number];

export type EmployeeOnboardingDocsResponse = z.infer<typeof onboardingDocListContractDef>;

export function useEmployeeOnboardingDocs(
  userId: string | null,
  cursor: string | undefined,
) {
  const canReviewDocs = useCan("hr:onboarding:manage");
  return useQuery<EmployeeOnboardingDocsResponse>({
    ...hrOnboardingDocAdminListQueryOptions({
      limit: REVIEW_DOCS_PAGE_SIZE,
      ...(userId ? { userId } : {}),
      ...(cursor ? { cursor } : {}),
    }),
    queryFn: ({ signal }) =>
      apiClient.get<EmployeeOnboardingDocsResponse>(
        "/hr/onboarding-docs",
        { userId, cursor, limit: REVIEW_DOCS_PAGE_SIZE },
        signal,
        onboardingDocListLazy,
      ),
    enabled: canReviewDocs && !!userId,
  });
}

export function useReviewDocument() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:onboarding:manage", {
    mutationKey: ["hr", "onboarding-docs", "review"],
    mutationFn: ({ docId, status, remarks }: { docId: number; status: "APPROVED" | "RE_UPLOAD_REQUESTED"; remarks?: string }) =>
      apiClient.patch(`/hr/onboarding-docs/${docId}`, {
        status,
        remarks,
      }, undefined, onboardingDocRowLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.onboardingDocsAll });
    },
  });
}

interface UploadOnboardingDocData {
  documentTypeId: number;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  targetUserId?: string;
}

function uploadOnboardingDocRequest(selfUpload: boolean, data: UploadOnboardingDocData) {
  if (selfUpload)
    return apiClient.post("/hr/onboarding-docs/me", data, undefined, onboardingDocRowLazy);
  return apiClient.post("/hr/onboarding-docs", data, undefined, onboardingDocRowLazy);
}

export function useUploadOnboardingDoc(selfUpload: boolean) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [
      "hr",
      "onboarding-documents",
      selfUpload ? "self-upload" : "admin-upload",
    ],
    mutationFn: (data: UploadOnboardingDocData) => uploadOnboardingDocRequest(selfUpload, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.onboardingDocsAll });
    },
  });
}
