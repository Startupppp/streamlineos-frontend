"use client";

import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { invalidateHrWorkforceQueries } from "@/lib/hr-workforce-cache";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";
import type {
  UpdateProfileInput,
  OnboardEmployeeInput,
  BulkOnboardEmployeeRow,
} from "@/types/hr";

const _successContract = lazyContract(() =>
  import("@/hooks/api/hr/employee-profile-schema").then(
    (m) => m.successContract,
  ),
);
const _onboardEmployeeContract = lazyContract(() =>
  import("@/hooks/api/hr/employee-profile-schema").then(
    (m) => m.onboardEmployeeResponseContract,
  ),
);
const _resendInviteContract = lazyContract(() =>
  import("@/hooks/api/hr/employee-profile-schema").then(
    (m) => m.resendEmployeeInviteResponseContract,
  ),
);
const _bulkOnboardContract = lazyContract(() =>
  import("@/hooks/api/hr/employee-profile-schema").then(
    (m) => m.bulkOnboardResultContract,
  ),
);
const _employmentContract = lazyContract(() =>
  import("@/hooks/api/hr/employee-profile-schema").then(
    (m) => m.employmentByUserIdContract,
  ),
);
const _timelineContract = lazyContract(() =>
  import("@/hooks/api/hr/employee-profile-schema").then(
    (m) => m.timelinePageContract,
  ),
);
const _sensitiveContract = lazyContract(() =>
  import("@/hooks/api/hr/employee-profile-schema").then(
    (m) => m.sensitiveRowContract,
  ),
);

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:update", {
    mutationKey: ["hr", "employees", "update"],
    mutationFn: ({ userId, ...data }: UpdateProfileInput) =>
      apiClient.patch(
        `/hr/employees/${userId}`,
        data,
        undefined,
        _successContract,
      ),
    onSuccess: (_, { userId }) => {
      void invalidateHrWorkforceQueries(qc, userId);
    },
  });
}

export function useOnboardEmployee() {
  const qc = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("hr:onboarding:manage", {
    mutationKey: ["hr", "employee", "onboard"],
    mutationFn: (data: OnboardEmployeeInput) =>
      apiClient.post(
        "/hr/employees/onboard",
        data,
        operation.configFor(data),
        _onboardEmployeeContract,
      ),
    onSuccess: (result) => void invalidateHrWorkforceQueries(qc, result.userId),
    onSettled: operation.settle,
  });
}

export function useResendEmployeeInvite() {
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("hr:onboarding:manage", {
    mutationKey: ["hr", "employee", "resend-invite"],
    mutationFn: (employeeId: string) =>
      apiClient.post(
        `/hr/employees/${employeeId}/resend-invite`,
        undefined,
        operation.configFor(employeeId),
        _resendInviteContract,
      ),
    onSettled: operation.settle,
  });
}

export function useBulkOnboardEmployees() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:onboarding:manage", {
    mutationKey: ["hr", "employee", "onboard", "bulk"],
    mutationFn: (employees: BulkOnboardEmployeeRow[]) =>
      apiClient.post(
        "/hr/employees/onboard/bulk",
        { employees },
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
        _bulkOnboardContract,
      ),
    onSuccess: () => void invalidateHrWorkforceQueries(qc),
  });
}

export function useEmployeeEmployment(userId: string) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.employeeEmployment(userId),
    queryFn: ({ signal }) =>
      apiClient.get(
        `/hr/employees/${userId}/employment`,
        undefined,
        signal,
        _employmentContract,
      ),
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
  return useInfiniteQuery({
    queryKey: humanResourcesQueryKeys.hr.employeeTimeline(employmentId ?? 0, {
      limit,
    }),
    queryFn: ({
      pageParam,
      signal,
    }: {
      pageParam: string | null;
      signal: AbortSignal;
    }) =>
      apiClient.get(
        `/hr/employees/${employmentId}/timeline`,
        {
          limit,
          ...(pageParam !== null ? { cursor: pageParam } : {}),
        },
        signal,
        _timelineContract,
      ),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.pageInfo.nextCursor,
    enabled: hrEnabled && !!employmentId && canView,
    staleTime: 2 * 60_000,
  });
}

export function useEmployeeSensitive(employmentId: number | undefined) {
  const canViewSensitive = useCan("hr:sensitive:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.employeeSensitive(employmentId ?? 0),
    queryFn: ({ signal }) =>
      apiClient.get(
        `/hr/employees/${employmentId}/sensitive`,
        undefined,
        signal,
        _sensitiveContract,
      ),
    enabled: hrEnabled && !!employmentId && canViewSensitive,
    staleTime: 30_000,
  });
}

export function useUpdateSensitive(employmentId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:sensitive:manage", {
    mutationKey: ["hr", "employee", "sensitive", "update", employmentId],
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.patch(
        `/hr/employees/${employmentId}/sensitive`,
        data,
        undefined,
        _successContract,
      ),
    onSuccess: () =>
      void qc.invalidateQueries({
        queryKey: humanResourcesQueryKeys.hr.employeeSensitive(employmentId),
      }),
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
      const blob = await apiClient.download(
        `/hr/employees/${employeeId}/profile-pdf`,
      );
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
