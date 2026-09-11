"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { accountingLedgerQueryKeys } from "@/lib/query-keys/accounting-ledger";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  AccountNode,
  AccountingPeriod,
  CreateAccountInput,
  EnableAccountingInput,
  EnableAccountingResult,
  FiscalYear,
  FxPreview,
  FxRate,
  GlSystemTag,
  Journal,
  OpeningBalancesInput,
  OpeningBalancesPreview,
  PostJournalInput,
  TaxRegistration,
  TaxRegime,
  UpdateAccountInput,
} from "@/types/accounting-kernel";

export function useEnableAccounting() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<EnableAccountingResult, Error, EnableAccountingInput>(
    "accounting:settings:manage",
    {
      mutationKey: ["accounting", "enable"],
      mutationFn: (input) =>
        apiClient.post<EnableAccountingResult>("/accounting/setup/enable", input),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: accountingLedgerQueryKeys.accountingLedger.all });
      },
    },
  );
}

export function useSetAccountSystemTag() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    AccountNode,
    Error,
    { accountId: string; systemTag: GlSystemTag | null }
  >("accounting:accounts:manage", {
    mutationKey: ["accounting", "accounts", "system-tag"],
    mutationFn: ({ accountId, systemTag }) =>
      apiClient.patch<AccountNode>(`/accounting/accounts/${accountId}/system-tag`, { systemTag }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingLedgerQueryKeys.accountingLedger.all });
    },
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<AccountNode, Error, CreateAccountInput>("accounting:accounts:create", {
    mutationKey: ["accounting", "accounts", "create"],
    mutationFn: (input) => apiClient.post<AccountNode>("/accounting/accounts", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingLedgerQueryKeys.accountingLedger.all });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<AccountNode, Error, { accountId: string; input: UpdateAccountInput }>(
    "accounting:accounts:update",
    {
      mutationKey: ["accounting", "accounts", "update"],
      mutationFn: ({ accountId, input }) =>
        apiClient.patch<AccountNode>(`/accounting/accounts/${accountId}`, input),
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({ queryKey: accountingLedgerQueryKeys.accountingLedger.accounts() });
        queryClient.invalidateQueries({
          queryKey: accountingLedgerQueryKeys.accountingLedger.account(variables.accountId),
        });
        queryClient.invalidateQueries({
          queryKey: accountingLedgerQueryKeys.accountingLedger.accountsPostable(),
        });
      },
    },
  );
}

export function useArchiveAccount() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    { deactivatedInsteadOfDeleted: boolean; postings: number },
    Error,
    string
  >("accounting:accounts:manage", {
    mutationKey: ["accounting", "accounts", "archive"],
    mutationFn: (accountId) =>
      apiClient.delete<{ deactivatedInsteadOfDeleted: boolean; postings: number }>(
        `/accounting/accounts/${accountId}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingLedgerQueryKeys.accountingLedger.all });
    },
  });
}

export function useLockPeriod() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<AccountingPeriod, Error, { periodId: string; reason?: string }>(
    "accounting:periods:manage",
    {
      mutationKey: ["accounting", "periods", "lock"],
      mutationFn: ({ periodId, reason }) =>
        apiClient.post<AccountingPeriod>(`/accounting/periods/${periodId}/lock`, { reason }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: accountingLedgerQueryKeys.accountingLedger.periods() });
      },
    },
  );
}

export function useUnlockPeriod() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<AccountingPeriod, Error, { periodId: string; reason: string }>(
    "accounting:periods:reopen",
    {
      mutationKey: ["accounting", "periods", "unlock"],
      mutationFn: ({ periodId, reason }) =>
        apiClient.post<AccountingPeriod>(`/accounting/periods/${periodId}/unlock`, { reason }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: accountingLedgerQueryKeys.accountingLedger.periods() });
      },
    },
  );
}

export function useOpenNextFiscalYear() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<FiscalYear, Error, void>("accounting:periods:manage", {
    mutationKey: ["accounting", "fiscalYears", "openNext"],
    mutationFn: () => apiClient.post<FiscalYear>("/accounting/fiscal-years/open-next", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingLedgerQueryKeys.accountingLedger.fiscalYears() });
      queryClient.invalidateQueries({ queryKey: accountingLedgerQueryKeys.accountingLedger.periods() });
    },
  });
}

export function usePostJournal() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<Journal, Error, PostJournalInput>("accounting:journal:post", {
    mutationKey: ["accounting", "journals", "post"],
    mutationFn: (input) => apiClient.post<Journal>("/accounting/journals/post", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingLedgerQueryKeys.accountingLedger.all });
    },
  });
}

export function useReverseJournal() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    Journal,
    Error,
    { journalId: string; idempotencyKey: string; journalDate?: string; memo?: string }
  >("accounting:journal:post", {
    mutationKey: ["accounting", "journals", "reverse"],
    mutationFn: ({ journalId, ...body }) =>
      apiClient.post<Journal>(`/accounting/journals/${journalId}/reverse`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingLedgerQueryKeys.accountingLedger.all });
    },
  });
}

export function useUpsertFxRate() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    FxRate,
    Error,
    { fromCode: string; toCode: string; rateDate: string; rate: string; source?: string }
  >("accounting:settings:manage", {
    mutationKey: ["accounting", "fxRates", "upsert"],
    mutationFn: (input) => apiClient.post<FxRate>("/accounting/fx-rates", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingLedgerQueryKeys.accountingLedger.fxRates() });
    },
  });
}

export function usePreviewFx() {
  return useAuthorizedMutation<
    FxPreview,
    Error,
    { amountMinor: number; fromCode: string; toCode: string; onDate: string }
  >("accounting:read", {
    mutationKey: ["accounting", "fx", "preview"],
    mutationFn: (input) => apiClient.post<FxPreview>("/accounting/fx/preview", input),
  });
}

export function usePreviewOpeningBalances() {
  return useAuthorizedMutation<OpeningBalancesPreview, Error, OpeningBalancesInput>(
    "accounting:settings:read",
    {
      mutationKey: ["accounting", "openingBalances", "preview"],
      mutationFn: (input) =>
        apiClient.post<OpeningBalancesPreview>("/accounting/setup/opening-balances/preview", input),
    },
  );
}

export function usePostOpeningBalances() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<Journal, Error, OpeningBalancesInput>("accounting:journal:post", {
    mutationKey: ["accounting", "openingBalances", "post"],
    mutationFn: (input) => apiClient.post<Journal>("/accounting/setup/opening-balances", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingLedgerQueryKeys.accountingLedger.all });
    },
  });
}

export function useAddTaxRegistration() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    TaxRegistration,
    Error,
    { regime: TaxRegime; number: string; region?: string | null; countryCode: string; isPrimary?: boolean }
  >("accounting:settings:manage", {
    mutationKey: ["accounting", "taxRegistrations", "add"],
    mutationFn: (input) =>
      apiClient.post<TaxRegistration>("/accounting/setup/tax-registrations", input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: accountingLedgerQueryKeys.accountingLedger.taxRegistrations(),
      });
      queryClient.invalidateQueries({ queryKey: accountingLedgerQueryKeys.accountingLedger.setupStatus() });
    },
  });
}
