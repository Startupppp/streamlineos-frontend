"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  EssOverview,
  EssPayslip,
  EssSalaryStructure,
  EssReimbursement,
  EssLoan,
  EssTaxDeclarationResponse,
  EssBankDetails,
  EssFnfSettlement,
} from "@/types/payroll/ess";

export const essKeys = {
  all: ["payroll", "ess"] as const,
  overview: () => ["payroll", "ess", "overview"] as const,
  payslips: () => ["payroll", "ess", "payslips"] as const,
  salaryStructure: () => ["payroll", "ess", "salary-structure"] as const,
  reimbursements: () => ["payroll", "ess", "reimbursements"] as const,
  loans: () => ["payroll", "ess", "loans"] as const,
  taxDeclaration: () => ["payroll", "ess", "tax-declaration"] as const,
  bank: () => ["payroll", "ess", "bank"] as const,
  fnf: () => ["payroll", "ess", "fnf"] as const,
};

export function useEssOverview() {
  return useQuery({
    queryKey: essKeys.overview(),
    queryFn: () => apiClient.get<EssOverview>("/payroll/me/overview"),
    staleTime: 30_000,
  });
}

export function useEssPayslips() {
  return useQuery({
    queryKey: essKeys.payslips(),
    queryFn: () => apiClient.get<EssPayslip[]>("/payroll/me/payslips"),
    staleTime: 300_000,
  });
}

export function useEssSalaryStructure() {
  return useQuery({
    queryKey: essKeys.salaryStructure(),
    queryFn: () => apiClient.get<EssSalaryStructure>("/payroll/me/salary-structure"),
    staleTime: 300_000,
  });
}

export function useEssReimbursements() {
  return useQuery({
    queryKey: essKeys.reimbursements(),
    queryFn: () => apiClient.get<EssReimbursement[]>("/payroll/me/reimbursements"),
    staleTime: 60_000,
  });
}

export function useEssLoans() {
  return useQuery({
    queryKey: essKeys.loans(),
    queryFn: () => apiClient.get<EssLoan[]>("/payroll/me/loans"),
    staleTime: 60_000,
  });
}

export function useEssTaxDeclaration() {
  return useQuery({
    queryKey: essKeys.taxDeclaration(),
    queryFn: () => apiClient.get<EssTaxDeclarationResponse>("/payroll/me/tax-declaration"),
    staleTime: 60_000,
  });
}

export function useEssBank() {
  return useQuery({
    queryKey: essKeys.bank(),
    queryFn: () => apiClient.get<EssBankDetails>("/payroll/me/bank"),
    staleTime: 300_000,
  });
}

export function useEssFnf() {
  return useQuery({
    queryKey: essKeys.fnf(),
    queryFn: () => apiClient.get<EssFnfSettlement | null>("/payroll/me/fnf"),
    staleTime: 120_000,
  });
}

interface SubmitReimbursementBody {
  category: string;
  amount: number;
  description: string;
  receiptUrl?: string;
  payrollMonth?: string;
}

export function useSubmitReimbursement() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "ess", "reimbursements", "submit"],
    mutationFn: (body: SubmitReimbursementBody) =>
      apiClient.post<EssReimbursement>("/payroll/me/reimbursements", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: essKeys.reimbursements() });
      qc.invalidateQueries({ queryKey: essKeys.overview() });
    },
  });
}

interface CreateLoanBody {
  amount: number;
  reason: string;
  totalEmis: number;
}

export function useCreateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "ess", "loans", "create"],
    mutationFn: (body: CreateLoanBody) =>
      apiClient.post<EssLoan>("/payroll/me/loans", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: essKeys.loans() });
      qc.invalidateQueries({ queryKey: essKeys.overview() });
    },
  });
}

interface SubmitTaxDeclarationBody {
  financialYear: string;
  regime: "OLD" | "NEW";
  hra?: number;
  lta?: number;
  section80c?: number;
  section80d?: number;
  section80g?: number;
  homeLoanInterest?: number;
}

export function useSubmitTaxDeclaration() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "ess", "tax-declaration", "submit"],
    mutationFn: (body: SubmitTaxDeclarationBody) =>
      apiClient.post<EssTaxDeclarationResponse>("/payroll/me/tax-declaration", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: essKeys.taxDeclaration() });
    },
  });
}

interface AddTaxProofBody {
  declarationId: number;
  category: string;
  amount: number;
  description?: string;
  proofUrl?: string;
}

export function useAddTaxProof() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "ess", "tax-declaration", "proofs", "add"],
    mutationFn: (body: AddTaxProofBody) =>
      apiClient.post<EssTaxDeclarationResponse>("/payroll/me/tax-declaration/proofs", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: essKeys.taxDeclaration() });
    },
  });
}

interface UpdateBankBody {
  accountNumber: string;
  bankName?: string;
  branch?: string;
  ifsc?: string;
  code?: string;
  accountHolder: string;
  bankCountry?: string;
  pfUanNumber?: string;
}

export function useUpdateBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "ess", "bank", "update"],
    mutationFn: (body: UpdateBankBody) =>
      apiClient.patch<EssBankDetails>("/payroll/me/bank", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: essKeys.bank() });
    },
  });
}
