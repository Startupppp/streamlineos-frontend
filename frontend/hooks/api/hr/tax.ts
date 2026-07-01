import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface TaxDeclaration {
  id: number;
  orgId: string;
  userId: string;
  financialYear: string;
  regime: "NEW" | "OLD";
  hra: string;
  lta: string;
  section80c: string;
  section80d: string;
  section80g: string;
  homeLoanInterest: string;
  status: "DRAFT" | "SUBMITTED" | "VERIFIED";
  verifiedBy: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentProof {
  id: number;
  orgId: string;
  declarationId: number;
  category: string;
  amount: string;
  description: string | null;
  proofUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

export type SaveDeclarationInput = Partial<
  Omit<TaxDeclaration, "id" | "orgId" | "userId" | "createdAt" | "updatedAt" | "verifiedBy" | "verifiedAt">
>;

export function useTaxDeclarations(year?: string) {
  return useQuery<TaxDeclaration[]>({
    queryKey: ["hr", "tax-declarations", year],
    queryFn: () =>
      apiClient.get<TaxDeclaration[]>("/hr/payroll/tax", year ? { year } : undefined).then((r) => r),
    staleTime: 60_000,
  });
}

export function useMyTaxDeclaration() {
  return useQuery<TaxDeclaration[]>({
    queryKey: ["hr", "tax-declarations", "mine"],
    queryFn: () => apiClient.get<TaxDeclaration[]>("/hr/payroll/tax/mine").then((r) => r),
    staleTime: 60_000,
  });
}

export function useDeclarationProofs(declarationId: number | null) {
  return useQuery<InvestmentProof[]>({
    queryKey: ["hr", "tax-declarations", declarationId, "proofs"],
    queryFn: () => {
      if (declarationId === null) return Promise.resolve([]);
      return apiClient.get<InvestmentProof[]>(`/hr/payroll/tax/${declarationId}/proofs`);
    },
    enabled: declarationId !== null,
    staleTime: 30_000,
  });
}

export function useSaveDeclaration() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "tax-declarations", "save"],
    mutationFn: (data: SaveDeclarationInput) =>
      apiClient.post<TaxDeclaration>("/hr/payroll/tax", data).then((r) => r),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "tax-declarations"] });
    },
  });
}

export function useVerifyDeclaration() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "tax-declarations", "verify"],
    mutationFn: (id: number) =>
      apiClient.patch<TaxDeclaration>(`/hr/payroll/tax/${id}/verify`).then((r) => r),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "tax-declarations"] });
    },
  });
}

export function useAddProof() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "tax-declarations", "add-proof"],
    mutationFn: ({
      declarationId,
      ...data
    }: {
      declarationId: number;
      category: string;
      amount: string;
      description?: string;
      proofUrl?: string;
    }) => apiClient.post<InvestmentProof>(`/hr/payroll/tax/${declarationId}/proofs`, data).then((r) => r),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "tax-declarations"] });
    },
  });
}
