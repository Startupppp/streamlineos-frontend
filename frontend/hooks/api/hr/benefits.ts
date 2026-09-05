import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export interface BenefitPlan {
  id: number;
  orgId: string;
  name: string;
  category: "health" | "life" | "accident" | "retirement" | "wellness" | "perk" | "other";
  provider: string | null;
  description: string | null;
  coverage: Record<string, unknown> | null;
  premiumCents: number | null;
  employerContributionPct: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: "draft" | "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface BenefitEnrollment {
  id: number;
  orgId: string;
  planId: number;
  userId: string;
  status: "pending" | "active" | "waived" | "terminated";
  enrolledAt: string;
  effectiveFrom: string | null;
  dependentsCovered: number;
  plan: BenefitPlan;
}

export interface Dependent {
  id: number;
  orgId: string;
  userId: string;
  name: string;
  relationship: "spouse" | "child" | "parent" | "other";
  dateOfBirth: string | null;
  isCovered: boolean;
  createdAt: string;
}

export interface InsuranceClaim {
  id: number;
  orgId: string;
  userId: string;
  planId: number;
  claimNumber: string;
  amountCents: number;
  status: "submitted" | "in_review" | "approved" | "rejected" | "paid";
  documents: { url: string; name: string }[] | null;
  submittedAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  rejectionReason: string | null;
  payoutRoute: "payroll_payable" | "finance_payable" | "already_paid" | null;
  user?: { id: string; name: string | null; email: string } | null;
  plan?: BenefitPlan | null;
}

export interface BenefitsCursorPage<T> {
  data: T[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
}

export type BenefitPlansQuery = {
  status?: BenefitPlan["status"];
  category?: BenefitPlan["category"];
  cursor?: string;
  limit?: number;
};

export function useBenefitPlans(query: BenefitPlansQuery = {}) {
  const canView = useCan("hr:benefits:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.benefitPlans(query),
    queryFn: ({ signal }) =>
      apiClient.get<BenefitsCursorPage<BenefitPlan>>(
        "/hr/benefits/plans",
        query as Record<string, unknown>, signal,
      ),
    staleTime: 2 * 60_000,
    enabled: canView && hrEnabled,
  });
}

export function useCreateBenefitPlan() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:benefits:manage", {
    mutationKey: ["hr", "benefits", "plans", "create"],
    mutationFn: (data: Omit<BenefitPlan, "id" | "orgId" | "createdAt" | "updatedAt">) =>
      apiClient.post<BenefitPlan>("/hr/benefits/plans", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.benefitsAll }),
  });
}

export function useUpdateBenefitPlan() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:benefits:manage", {
    mutationKey: ["hr", "benefits", "plans", "update"],
    mutationFn: ({ id, ...data }: Partial<BenefitPlan> & { id: number }) =>
      apiClient.patch<BenefitPlan>(`/hr/benefits/plans/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.benefitsAll }),
  });
}

export function useMyBenefits() {
  const canView = useCan("hr:benefits:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.benefitMy,
    queryFn: ({ signal }) =>
      apiClient.get<{ enrollments: BenefitEnrollment[]; dependents: Dependent[] }>("/hr/benefits/my", undefined, signal),
    staleTime: 60_000,
    enabled: canView && hrEnabled,
  });
}

export function useEnroll() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:benefits:view", {
    mutationKey: ["hr", "benefits", "enroll"],
    mutationFn: (data: { planId: number; effectiveFrom?: string; dependentsCovered?: number }) =>
      apiClient.post<BenefitEnrollment>("/hr/benefits/enroll", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.benefitMy }),
  });
}

export function useWaive() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:benefits:view", {
    mutationKey: ["hr", "benefits", "waive"],
    mutationFn: (data: { planId: number }) =>
      apiClient.post<BenefitEnrollment>("/hr/benefits/waive", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.benefitMy }),
  });
}

export function useDependents() {
  const canView = useCan("hr:benefits:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.benefitDependents,
    queryFn: ({ signal }) => apiClient.get<Dependent[]>("/hr/benefits/dependents", undefined, signal),
    staleTime: 2 * 60_000,
    enabled: canView && hrEnabled,
  });
}

export function useAddDependent() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:benefits:view", {
    mutationKey: ["hr", "benefits", "dependents", "add"],
    mutationFn: (data: { name: string; relationship: string; dateOfBirth?: string; isCovered?: boolean }) =>
      apiClient.post<Dependent>("/hr/benefits/dependents", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.benefitDependents });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.benefitMy });
    },
  });
}

export function useDeleteDependent() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:benefits:view", {
    mutationKey: ["hr", "benefits", "dependents", "delete"],
    mutationFn: (id: number) => apiClient.delete<{ ok: boolean }>(`/hr/benefits/dependents/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.benefitDependents }),
  });
}

export type InsuranceClaimsQuery = {
  status?: InsuranceClaim["status"];
  userId?: string;
  cursor?: string;
  limit?: number;
};

export function useInsuranceClaims(query: InsuranceClaimsQuery = {}) {
  const canView = useCan("hr:benefits:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.benefitClaims(query),
    queryFn: ({ signal }) =>
      apiClient.get<BenefitsCursorPage<InsuranceClaim>>(
        "/hr/benefits/claims",
        query as Record<string, unknown>, signal,
      ),
    staleTime: 60_000,
    enabled: canView && hrEnabled,
  });
}

export function useReviewClaim() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:benefits:manage", {
    mutationKey: ["hr", "benefits", "claims", "review"],
    mutationFn: ({
      claimId,
      ...data
    }: {
      claimId: number;
      status: "approved" | "rejected" | "in_review";
      rejectionReason?: string;
      payoutRoute?: string;
    }) => apiClient.patch<InsuranceClaim>(`/hr/benefits/claims/${claimId}/review`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.benefitsAll }),
  });
}

