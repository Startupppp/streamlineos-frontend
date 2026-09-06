"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const REVIEW_DOCS_PAGE_SIZE = 20;

export interface EmployeeOnboardingDoc {
  id: number;
  documentTypeId: number;
  documentTypeName: string;
  isMandatory: boolean;
  hasFile: boolean;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  version: number | null;
  status: "PENDING" | "SUBMITTED" | "APPROVED" | "REJECTED" | "RE_UPLOAD_REQUESTED";
  reviewedAt: string | null;
  reviewerName: string | null;
  remarks: string | null;
  createdAt: string | null;
}

export interface EmployeeOnboardingDocsResponse {
  data: EmployeeOnboardingDoc[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

export function useEmployeeOnboardingDocs(
  userId: string | null,
  cursor: string | undefined,
) {
  const canReviewDocs = useCan("hr:onboarding:manage");
  return useQuery<EmployeeOnboardingDocsResponse>({
    queryKey: humanResourcesQueryKeys.hr.onboardingDocs({
      userId: userId ?? undefined,
      cursor,
      limit: REVIEW_DOCS_PAGE_SIZE,
    }),
    queryFn: ({ signal }) =>
      apiClient.get<EmployeeOnboardingDocsResponse>(
        "/hr/onboarding-docs",
        { userId, cursor, limit: REVIEW_DOCS_PAGE_SIZE },
        signal,
      ),
    enabled: canReviewDocs && !!userId,
    staleTime: 30_000,
  });
}

export function useReviewDocument() {
  const qc = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, { docId: number; status: "APPROVED" | "RE_UPLOAD_REQUESTED"; remarks?: string }>("hr:onboarding:manage", {
    mutationKey: ["hr", "onboarding-docs", "review"],
    mutationFn: ({ docId, status, remarks }) =>
      apiClient.patch<{ success: boolean }>(`/hr/onboarding-docs/${docId}`, {
        status,
        remarks,
      }),
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
    return apiClient.post("/hr/onboarding-docs/me", data);
  return apiClient.post("/hr/onboarding-docs", data);
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
