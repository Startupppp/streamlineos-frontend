"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { lazyContract } from "@/lib/api-envelope";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";
import { downloadBlob } from "@/lib/download-blob";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const form16ListC = lazyContract(() =>
  import("@/hooks/api/payroll/form16-schema").then((m) => m.form16ListContract),
);
const form16RowC = lazyContract(() =>
  import("@/hooks/api/payroll/form16-schema").then((m) => m.form16RowContract),
);
const form16ReleaseAllC = lazyContract(() =>
  import("@/hooks/api/payroll/form16-schema").then((m) => m.form16ReleaseAllContract),
);
const essForm16ListC = lazyContract(() =>
  import("@/hooks/api/payroll/form16-schema").then((m) => m.essForm16ListContract),
);

export function currentFinancialYear(now = new Date()): string {
  const year = now.getFullYear();
  const start = now.getMonth() + 1 >= 4 ? year : year - 1;
  return `${start}-${String(start + 1).slice(2)}`;
}

export function recentFinancialYears(count = 5, now = new Date()): string[] {
  const start = Number(currentFinancialYear(now).slice(0, 4));
  return Array.from({ length: count }, (_, i) => `${start - i}-${String(start - i + 1).slice(2)}`);
}

export function useForm16Documents(financialYear: string) {
  const canView = useCan("payroll:tax:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.form16(financialYear),
    queryFn: ({ signal }) => apiClient.get("/payroll/form16", { financialYear }, signal, form16ListC),
    staleTime: 30_000,
    enabled: canView,
    ...INLINE_READ_ERROR,
  });
}

function useInvalidateForm16() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.form16All });
}

export function useUploadForm16() {
  const invalidate = useInvalidateForm16();
  return useAuthorizedMutation("payroll:tax:manage", {
    mutationKey: ["payroll", "form16", "upload"],
    mutationFn: ({ financialYear, membershipId, file }: { financialYear: string; membershipId: number; file: File }) => {
      const fd = new FormData();
      fd.append("file", file);
      return apiClient.upload(`/payroll/form16/${financialYear}/members/${membershipId}/upload`, fd, form16RowC);
    },
    onSuccess: invalidate,
  });
}

export function useReleaseForm16() {
  const invalidate = useInvalidateForm16();
  return useAuthorizedMutation("payroll:tax:manage", {
    mutationKey: ["payroll", "form16", "release"],
    mutationFn: ({ financialYear, membershipId }: { financialYear: string; membershipId: number }) =>
      apiClient.post(`/payroll/form16/${financialYear}/members/${membershipId}/release`, undefined, undefined, form16RowC),
    onSuccess: invalidate,
  });
}

export function useReleaseAllForm16() {
  const invalidate = useInvalidateForm16();
  return useAuthorizedMutation("payroll:tax:manage", {
    mutationKey: ["payroll", "form16", "release-all"],
    mutationFn: (financialYear: string) =>
      apiClient.post(`/payroll/form16/${financialYear}/release-all`, undefined, undefined, form16ReleaseAllC),
    onSuccess: invalidate,
  });
}

export async function downloadForm16(financialYear: string, membershipId: number): Promise<void> {
  const blob = await apiClient.download(`/payroll/form16/${financialYear}/members/${membershipId}/download`);
  downloadBlob(blob, `Form16-${financialYear}-${membershipId}.pdf`);
}

export function useEssForm16() {
  const canSelf = useCan("self:payslips");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.essForm16(),
    queryFn: ({ signal }) => apiClient.get("/payroll/me/form16", undefined, signal, essForm16ListC),
    staleTime: 300_000,
    enabled: canSelf,
    ...INLINE_READ_ERROR,
  });
}

export async function downloadOwnForm16(financialYear: string): Promise<void> {
  const blob = await apiClient.download(`/payroll/me/form16/${financialYear}/download`);
  downloadBlob(blob, `Form16-${financialYear}.pdf`);
}
