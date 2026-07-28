import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

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

export interface EnrollmentWindow {
  id: number;
  orgId: string;
  planId: number | null;
  opensAt: string;
  closesAt: string;
  status: "upcoming" | "open" | "closed";
  createdAt: string;
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

export function useAvailableBenefitPlans() {
  return useQuery({
    queryKey: queryKeys.hr.benefitAvailable(),
    queryFn: () =>
      apiClient.get<{ data: BenefitPlan[]; total: number; page: number; limit: number }>(
        "/hr/benefits/plans/available",
      ),
    staleTime: 5 * 60_000,
  });
}

export function useBenefitPlans(query?: { status?: string; category?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.hr.benefitPlans(query),
    queryFn: () =>
      apiClient.get<{ data: BenefitPlan[]; total: number; page: number; limit: number }>(
        "/hr/benefits/plans",
        query as Record<string, unknown>,
      ),
    staleTime: 2 * 60_000,
  });
}

export function useBenefitPlan(planId: number) {
  return useQuery({
    queryKey: queryKeys.hr.benefitPlan(planId),
    queryFn: () => apiClient.get<BenefitPlan>(`/hr/benefits/plans/${planId}`),
    staleTime: 5 * 60_000,
  });
}

export function useCreateBenefitPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "benefits", "plans", "create"],
    mutationFn: (data: Omit<BenefitPlan, "id" | "orgId" | "createdAt" | "updatedAt">) =>
      apiClient.post<BenefitPlan>("/hr/benefits/plans", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.benefitsAll }),
  });
}

export function useUpdateBenefitPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "benefits", "plans", "update"],
    mutationFn: ({ id, ...data }: Partial<BenefitPlan> & { id: number }) =>
      apiClient.patch<BenefitPlan>(`/hr/benefits/plans/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.benefitsAll }),
  });
}

export function useDeleteBenefitPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "benefits", "plans", "delete"],
    mutationFn: (id: number) => apiClient.delete<{ ok: boolean }>(`/hr/benefits/plans/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.benefitsAll }),
  });
}

export function useEnrollmentWindows() {
  return useQuery({
    queryKey: queryKeys.hr.benefitWindows,
    queryFn: () => apiClient.get<EnrollmentWindow[]>("/hr/benefits/windows"),
    staleTime: 2 * 60_000,
  });
}

export function useCreateEnrollmentWindow() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "benefits", "windows", "create"],
    mutationFn: (data: { planId?: number; opensAt: string; closesAt: string; status?: string }) =>
      apiClient.post<EnrollmentWindow>("/hr/benefits/windows", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.benefitWindows }),
  });
}

export function useMyBenefits() {
  return useQuery({
    queryKey: queryKeys.hr.benefitMy,
    queryFn: () =>
      apiClient.get<{ enrollments: BenefitEnrollment[]; dependents: Dependent[] }>("/hr/benefits/my"),
    staleTime: 60_000,
  });
}

export function useEnroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "benefits", "enroll"],
    mutationFn: (data: { planId: number; effectiveFrom?: string; dependentsCovered?: number }) =>
      apiClient.post<BenefitEnrollment>("/hr/benefits/enroll", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.benefitMy }),
  });
}

export function useWaive() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "benefits", "waive"],
    mutationFn: (data: { planId: number }) =>
      apiClient.post<BenefitEnrollment>("/hr/benefits/waive", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.benefitMy }),
  });
}

export function useDependents() {
  return useQuery({
    queryKey: queryKeys.hr.benefitDependents,
    queryFn: () => apiClient.get<Dependent[]>("/hr/benefits/dependents"),
    staleTime: 2 * 60_000,
  });
}

export function useAddDependent() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "benefits", "dependents", "add"],
    mutationFn: (data: { name: string; relationship: string; dateOfBirth?: string; isCovered?: boolean }) =>
      apiClient.post<Dependent>("/hr/benefits/dependents", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.benefitDependents });
      qc.invalidateQueries({ queryKey: queryKeys.hr.benefitMy });
    },
  });
}

export function useUpdateDependent() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "benefits", "dependents", "update"],
    mutationFn: ({ id, ...data }: Partial<Dependent> & { id: number }) =>
      apiClient.patch<Dependent>(`/hr/benefits/dependents/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.benefitDependents }),
  });
}

export function useDeleteDependent() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "benefits", "dependents", "delete"],
    mutationFn: (id: number) => apiClient.delete<{ ok: boolean }>(`/hr/benefits/dependents/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.benefitDependents }),
  });
}

export function useInsuranceClaims(query?: { status?: string; userId?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.hr.benefitClaims(query),
    queryFn: () =>
      apiClient.get<{ data: InsuranceClaim[]; total: number; page: number; limit: number }>(
        "/hr/benefits/claims",
        query as Record<string, unknown>,
      ),
    staleTime: 60_000,
  });
}

export function useSubmitClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "benefits", "claims", "submit"],
    mutationFn: (data: { planId: number; claimNumber: string; amountCents: number; documents?: { url: string; name: string }[] }) =>
      apiClient.post<InsuranceClaim>("/hr/benefits/claims", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.benefitsAll }),
  });
}

export function useReviewClaim() {
  const qc = useQueryClient();
  return useMutation({
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
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.benefitsAll }),
  });
}

export function useSetClaimPayoutRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "benefits", "claims", "payout-route"],
    mutationFn: ({ claimId, payoutRoute }: { claimId: number; payoutRoute: string }) =>
      apiClient.patch<InsuranceClaim>(`/hr/benefits/claims/${claimId}/payout-route`, { payoutRoute }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.benefitsAll }),
  });
}

export interface TravelVisitLog {
  id: number;
  orgId: string;
  travelRequestId: number;
  userId: string;
  visitedAt: string;
  location: string;
  lat: string | null;
  lng: string | null;
  note: string | null;
  createdAt: string;
}

export function useTravelVisitLogs(travelRequestId: number) {
  return useQuery({
    queryKey: queryKeys.hr.travelVisitLogs(travelRequestId),
    queryFn: () => apiClient.get<TravelVisitLog[]>(`/hr/travel-visits/${travelRequestId}`),
    staleTime: 60_000,
  });
}

export function useAddTravelVisitLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "travel-visits", "add"],
    mutationFn: (data: {
      travelRequestId: number;
      visitedAt: string;
      location: string;
      lat?: string;
      lng?: string;
      note?: string;
    }) => apiClient.post<TravelVisitLog>("/hr/travel-visits", data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.travelVisitLogs(vars.travelRequestId) });
    },
  });
}
