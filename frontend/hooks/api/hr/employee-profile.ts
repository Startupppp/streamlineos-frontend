"use client";

import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { invalidateHrWorkforceQueries } from "@/lib/hr-workforce-cache";
import type {
  UpdateProfileInput,
  OnboardEmployeeInput,
  BulkOnboardEmployeeRow,
  BulkOnboardResult,
} from "@/types/hr";
import type {
  HrEmployment,
  HrTimelineResponse,
  HrSensitiveData,
} from "@/types/hr/core";

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:update", {
    mutationKey: ["hr", "employees", "update"],
    mutationFn: ({ userId, ...data }: UpdateProfileInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/employees/${userId}`, data),
    onSuccess: (_, { userId }) => {
      void invalidateHrWorkforceQueries(qc, userId);
    },
  });
}

export function useOnboardEmployee() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:onboarding:manage", {
    mutationKey: ["hr", "employee", "onboard"],
    mutationFn: (data: OnboardEmployeeInput) =>
      apiClient.post<{ success: boolean; userId: string }>("/hr/employees/onboard", data),
    onSuccess: (result) => void invalidateHrWorkforceQueries(qc, result.userId),
  });
}

export function useBulkOnboardEmployees() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:onboarding:manage", {
    mutationKey: ["hr", "employee", "onboard", "bulk"],
    mutationFn: (employees: BulkOnboardEmployeeRow[]) =>
      apiClient.post<BulkOnboardResult>(
        "/hr/employees/onboard/bulk",
        { employees },
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
      ),
    onSuccess: () => void invalidateHrWorkforceQueries(qc),
  });
}

export function useEmployeeEmployment(userId: string) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.employeeEmployment(userId),
    queryFn: ({ signal }) => apiClient.get<HrEmployment>(`/hr/employees/${userId}/employment`, undefined, signal),
    enabled: hrEnabled && !!userId && canView,
    staleTime: 5 * 60_000,
  });
}

export function useEmployeeTimeline(
  employmentId: number | undefined,
  params?: { limit?: number },
) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  const limit = params?.limit ?? 20;
  const initialPageParam: string | null = null;
  return useInfiniteQuery({
    queryKey: humanResourcesQueryKeys.hr.employeeTimeline(employmentId ?? 0, { limit }),
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<HrTimelineResponse>(
        `/hr/employees/${employmentId}/timeline`,
        {
          limit,
          ...(pageParam !== null ? { cursor: pageParam } : {}),
        }, signal,
      ),
    initialPageParam,
    getNextPageParam: (lastPage) => lastPage.pageInfo.nextCursor ?? undefined,
    enabled: hrEnabled && !!employmentId && canView,
    staleTime: 2 * 60_000,
  });
}

export function useEmployeeSensitive(employmentId: number | undefined) {
  const canViewSensitive = useCan("hr:sensitive:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.employeeSensitive(employmentId ?? 0),
    queryFn: ({ signal }) => apiClient.get<HrSensitiveData>(`/hr/employees/${employmentId}/sensitive`, undefined, signal),
    enabled: hrEnabled && !!employmentId && canViewSensitive,
    staleTime: 30_000,
  });
}

export function useUpdateSensitive(employmentId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:sensitive:manage", {
    mutationKey: ["hr", "employee", "sensitive", "update", employmentId],
    mutationFn: (data: Partial<HrSensitiveData>) =>
      apiClient.patch<{ success: boolean }>(`/hr/employees/${employmentId}/sensitive`, data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.employeeSensitive(employmentId) }),
  });
}

export function useExportEmployeePdf(
  employeeId: string,
  employeeName: string,
  options?: { onError?: (err: Error) => void },
) {
  return useMutation({
    mutationKey: ["hr", "employees", employeeId, "profile-pdf"],
    mutationFn: async () => {
      const blob = await apiClient.download(`/hr/employees/${employeeId}/profile-pdf`);
      const header = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
      const isPdf =
        header.length >= 5 &&
        header[0] === 0x25 &&
        header[1] === 0x50 &&
        header[2] === 0x44 &&
        header[3] === 0x46 &&
        header[4] === 0x2d;
      if (!isPdf)
        throw new Error("Export did not return a valid PDF. Please try again.");
      const pdfBlob =
        blob.type === "application/pdf"
          ? blob
          : new Blob([blob], { type: "application/pdf" });
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `employee-profile-${employeeName.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    onError: options?.onError,
  });
}
