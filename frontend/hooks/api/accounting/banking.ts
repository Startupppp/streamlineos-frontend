"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import type { CursorPage } from "@/hooks/api/accounting";
import type {
  BankAccount,
  BankAccountType,
  BankImport,
  BankImportResult,
  BankTransaction,
  BankTransfer,
  BankTxnStatus,
} from "./banking-types";
import { bankingKeys, toQuery } from "./banking-keys";

export * from "./banking-types";
export { bankingKeys } from "./banking-keys";
export * from "./banking-reconciliation";

export type ListBankAccountsParams = {
  cursor?: string;
  limit?: number;
};

export function useBankAccounts(params: ListBankAccountsParams = {}) {
  const can = useCan("accounting:banking:read");
  return useQuery<CursorPage<BankAccount>, Error>({
    queryKey: bankingKeys.accounts(params),
    queryFn: () =>
      apiClient.get<CursorPage<BankAccount>>("/finance/bank-accounts", toQuery(params)),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useBankAccount(id: number) {
  const can = useCan("accounting:banking:read");
  return useQuery<BankAccount, Error>({
    queryKey: bankingKeys.account(id),
    queryFn: () => apiClient.get<BankAccount>(`/finance/bank-accounts/${id}`),
    staleTime: 60_000,
    enabled: can,
  });
}

type ListTxnParams = {
  status?: BankTxnStatus;
  from?: string;
  to?: string;
  q?: string;
  cursor?: string;
  limit?: number;
};

export function useBankTransactions(bankAccountId: number, params: ListTxnParams = {}) {
  const can = useCan("accounting:banking:read");
  return useQuery<CursorPage<BankTransaction>, Error>({
    queryKey: bankingKeys.transactions(bankAccountId, params),
    queryFn: () =>
      apiClient.get<CursorPage<BankTransaction>>(
        `/finance/bank-accounts/${bankAccountId}/transactions`,
        toQuery(params),
      ),
    staleTime: 30_000,
    enabled: can,
  });
}

export interface CreateBankAccountInput {
  name: string;
  accountType: BankAccountType;
  bankName?: string;
  accountNumberMasked?: string;
  ifsc?: string;
  currency: string;
  ledgerAccountId?: number;
  openingBalance: string;
  openingBalanceDate?: string;
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient();
  return useMutation<BankAccount, Error, CreateBankAccountInput>({
    mutationKey: ["banking", "createAccount"],
    mutationFn: (data) => apiClient.post<BankAccount>("/finance/bank-accounts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankingKeys.all });
      toast.success("Bank account created");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });
}

export interface CreateBankImportInput {
  bankAccountId: number;
  fileName: string;
  columnMapping: {
    date: string;
    description: string;
    amount?: string;
    debit?: string;
    credit?: string;
    reference?: string;
    counterparty?: string;
  };
  rows: string[][];
  dateFormat: string;
  hasHeaderRow: boolean;
}

export function useCreateBankImport() {
  const queryClient = useQueryClient();
  return useMutation<BankImportResult, Error, CreateBankImportInput>({
    mutationKey: ["banking", "createImport"],
    mutationFn: (data) => apiClient.post<BankImportResult>("/finance/bank-imports", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankingKeys.all });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });
}

export type ListTransfersParams = {
  cursor?: string;
  limit?: number;
  from?: string;
  to?: string;
};

export type ListBankImportsParams = {
  cursor?: string;
  limit?: number;
  bankAccountId?: number;
};

export function useBankImports(params: ListBankImportsParams = {}) {
  const can = useCan("accounting:banking:read");
  return useQuery<CursorPage<BankImport>, Error>({
    queryKey: bankingKeys.imports(params),
    queryFn: () =>
      apiClient.get<CursorPage<BankImport>>("/finance/bank-imports", toQuery(params)),
    staleTime: 30_000,
    enabled: can,
  });
}

export function useTransfers(params: ListTransfersParams = {}) {
  const can = useCan("accounting:banking:read");
  return useQuery<CursorPage<BankTransfer>, Error>({
    queryKey: bankingKeys.transfers(params),
    queryFn: () =>
      apiClient.get<CursorPage<BankTransfer>>("/finance/transfers", toQuery(params)),
    staleTime: 30_000,
    enabled: can,
  });
}

export interface CreateTransferInput {
  fromBankAccountId: number;
  toBankAccountId: number;
  amount: string;
  transferDate: string;
  reference?: string;
  description?: string;
}

export function useCreateTransfer() {
  const queryClient = useQueryClient();
  return useMutation<BankTransfer, Error, CreateTransferInput>({
    mutationKey: ["banking", "createTransfer"],
    mutationFn: (data) => apiClient.post<BankTransfer>("/finance/transfers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankingKeys.transfers() });
      queryClient.invalidateQueries({ queryKey: bankingKeys.accounts() });
      toast.success("Transfer created");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });
}
