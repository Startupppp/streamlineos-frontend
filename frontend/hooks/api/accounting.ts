"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  Account,
  AccountType,
  AgedPayablesReport,
  AgedReceivablesReport,
  BalanceSheetReport,
  CustomerLedger,
  CustomerOutstanding,
  Gstr1Report,
  Gstr3BReport,
  JournalEntry,
  JournalEntryStatus,
  ProfitLossReport,
  PurchaseBill,
  PurchaseBillStatus,
  PurchaseBillSummary,
  TrialBalanceRow,
  VendorLedger,
  VendorOutstanding,
} from "@/types/accounting";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CursorPage<T> {
  data: T[];
  pagination: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

type CursorResponse<T> = CursorPage<T>;

interface TrialBalanceResponse {
  asOf: string;
  rows: TrialBalanceRow[];
  totalDebit: string;
  totalCredit: string;
  balanced: boolean;
}

interface ListAccountsParams {
  cursor?: string;
  limit?: number;
  q?: string;
  type?: AccountType;
  activeOnly?: boolean;
}

function toQuery<P extends object>(params: P): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = String(v);
  }
  return out;
}

export function useAccounts(params: ListAccountsParams = {}) {
  return useQuery<CursorResponse<Account>, Error>({
    queryKey: queryKeys.accounting.accounts(params),
    queryFn: ({ signal }) =>
      apiClient.get<CursorResponse<Account>>("/accounting/accounts", toQuery(params), signal),
    staleTime: 60_000,
  });
}

interface CreateAccountInput {
  code: string;
  name: string;
  accountType: AccountType;
  description?: string;
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<Account, Error, CreateAccountInput>("accounting:accounts:create", {
    mutationKey: ["create", "account"],
    mutationFn: (data) => apiClient.post<Account>("/accounting/accounts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
    },
  });
}

interface UpdateAccountInput {
  name?: string;
  isActive?: boolean;
  description?: string;
}

export function useUpdateAccount(accountId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<Account, Error, UpdateAccountInput>("accounting:accounts:update", {
    mutationKey: ["update", "account"],
    mutationFn: (data) => apiClient.patch<Account>(`/accounting/accounts/${accountId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
    },
  });
}

interface ListJournalParams {
  cursor?: string;
  limit?: number;
  from?: string;
  to?: string;
  sourceType?: string;
  status?: JournalEntryStatus;
}

export function useJournal(params: ListJournalParams = {}) {
  const can = useCan("accounting:journal:read");
  return useQuery<CursorResponse<JournalEntry>, Error>({
    queryKey: queryKeys.accounting.journal(params),
    queryFn: ({ signal }) =>
      apiClient.get<CursorResponse<JournalEntry>>("/accounting/journal", toQuery(params), signal),
    staleTime: 30_000,
    enabled: can,
  });
}

export function useJournalEntry(entryId: number) {
  return useQuery<JournalEntry, Error>({
    queryKey: queryKeys.accounting.journalEntry(entryId),
    queryFn: ({ signal }) => apiClient.get<JournalEntry>(`/accounting/journal/${entryId}`, undefined, signal),
    enabled: Number.isInteger(entryId) && entryId > 0,
    staleTime: 30_000,
  });
}

interface ReverseJournalEntryResult {
  id: number;
  entryNumber: string;
  created: boolean;
}

export function useReverseJournalEntry(entryId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<ReverseJournalEntryResult, Error, void>("accounting:journal:manage", {
    mutationKey: ["reverse", "journal", "entry"],
    mutationFn: () =>
      apiClient.post<ReverseJournalEntryResult>(`/accounting/journal/${entryId}/reverse`),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.journalEntry(entryId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.journalEntry(result.id) });
    },
  });
}

interface CreateJournalEntryLine {
  accountCode: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface CreateJournalEntryInput {
  entryDate: string;
  description: string;
  status: "DRAFT" | "POSTED";
  lines: CreateJournalEntryLine[];
}

interface CreateJournalEntryResult {
  id: number;
  entryNumber: string;
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<CreateJournalEntryResult, Error, CreateJournalEntryInput>("accounting:journal:manage", {
    mutationKey: ["create", "journal", "entry"],
    mutationFn: (input) => apiClient.post<CreateJournalEntryResult>("/accounting/journal", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
    },
  });
}

interface PostJournalEntryResult {
  id: number;
  entryNumber: string;
  status: "DRAFT" | "POSTED" | "VOID";
}

export function usePostJournalEntry(entryId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<PostJournalEntryResult, Error, void>("accounting:journal:manage", {
    mutationKey: ["post", "journal", "entry"],
    mutationFn: () => apiClient.post<PostJournalEntryResult>(`/accounting/journal/${entryId}/post`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.journalEntry(entryId) });
    },
  });
}

export function useTrialBalance(asOf: string) {
  return useQuery<TrialBalanceResponse, Error>({
    queryKey: queryKeys.accounting.trialBalance(asOf),
    queryFn: ({ signal }) =>
      apiClient.get<TrialBalanceResponse>("/accounting/reports/trial-balance", { asOf }, signal),
    enabled: !!asOf,
    staleTime: 30_000,
  });
}

export function useProfitLoss(from: string, to: string) {
  return useQuery<ProfitLossReport, Error>({
    queryKey: queryKeys.accounting.profitLoss(from, to),
    queryFn: ({ signal }) =>
      apiClient.get<ProfitLossReport>("/accounting/reports/profit-loss", { from, to }, signal),
    enabled: !!from && !!to,
    staleTime: 30_000,
  });
}

type CashFlowSectionKey = "operating" | "investing" | "financing";

interface CashFlowLineItem {
  label: string;
  amount: string;
}

export interface CashFlowSection {
  key: CashFlowSectionKey;
  label: string;
  items: CashFlowLineItem[];
  total: string;
}

interface CashFlowReport {
  from: string;
  to: string;
  openingCash: string;
  closingCash: string;
  netChange: string;
  reconciled: boolean;
  sections: CashFlowSection[];
}

interface CashFlowParams {
  from: string;
  to: string;
}

export function useCashFlow({ from, to }: CashFlowParams) {
  return useQuery<CashFlowReport, Error>({
    queryKey: queryKeys.accounting.cashFlow({ from, to }),
    queryFn: ({ signal }) => apiClient.get<CashFlowReport>("/accounting/reports/cash-flow", { from, to }, signal),
    enabled: !!from && !!to,
    staleTime: 30_000,
  });
}

interface ListCustomersOutstandingParams {
  cursor?: string;
  limit?: number;
  q?: string;
  onlyOutstanding?: boolean;
}

export function useCustomersOutstanding(params: ListCustomersOutstandingParams = {}) {
  return useQuery<CursorPage<CustomerOutstanding>, Error>({
    queryKey: queryKeys.accounting.customersOutstanding(params),
    queryFn: ({ signal }) =>
      apiClient.get<CursorPage<CustomerOutstanding>>("/accounting/customers", toQuery(params), signal),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

interface CustomerLedgerParams {
  from?: string;
  to?: string;
}

export function useCustomerLedger(clientId: number, params: CustomerLedgerParams = {}) {
  return useQuery<CustomerLedger, Error>({
    queryKey: queryKeys.accounting.customerLedger(clientId, params),
    queryFn: ({ signal }) =>
      apiClient.get<CustomerLedger>(`/accounting/customers/${clientId}/ledger`, toQuery(params), signal),
    enabled: Number.isInteger(clientId) && clientId > 0,
    staleTime: 60_000,
  });
}

export function useGstr1(from: string, to: string) {
  return useQuery<Gstr1Report, Error>({
    queryKey: queryKeys.accounting.gstr1({ from, to }),
    queryFn: ({ signal }) => apiClient.get<Gstr1Report>("/accounting/reports/gstr-1", { from, to }, signal),
    enabled: !!from && !!to,
    staleTime: 30_000,
  });
}

export function useBalanceSheet(asOf: string) {
  return useQuery<BalanceSheetReport, Error>({
    queryKey: queryKeys.accounting.balanceSheet({ asOf }),
    queryFn: ({ signal }) => apiClient.get<BalanceSheetReport>("/accounting/reports/balance-sheet", { asOf }, signal),
    enabled: !!asOf,
    staleTime: 30_000,
  });
}

export function useAgedReceivables(asOf: string) {
  return useQuery<AgedReceivablesReport, Error>({
    queryKey: queryKeys.accounting.agedReceivables({ asOf }),
    queryFn: ({ signal }) => apiClient.get<AgedReceivablesReport>("/accounting/reports/aged-receivables", { asOf }, signal),
    enabled: !!asOf,
    staleTime: 30_000,
  });
}

interface ListPurchaseBillsParams {
  cursor?: string;
  limit?: number;
  q?: string;
  status?: PurchaseBillStatus;
  vendorId?: number;
}

export function usePurchaseBills(params: ListPurchaseBillsParams = {}) {
  return useQuery<CursorResponse<PurchaseBillSummary>, Error>({
    queryKey: queryKeys.accounting.purchaseBills(params),
    queryFn: ({ signal }) =>
      apiClient.get<CursorResponse<PurchaseBillSummary>>("/accounting/purchase-bills", toQuery(params), signal),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function usePurchaseBill(billId: number) {
  return useQuery<PurchaseBill, Error>({
    queryKey: queryKeys.accounting.purchaseBill(billId),
    queryFn: ({ signal }) => apiClient.get<PurchaseBill>(`/accounting/purchase-bills/${billId}`, undefined, signal),
    enabled: Number.isInteger(billId) && billId > 0,
    staleTime: 60_000,
  });
}

interface CreatePurchaseBillLine {
  description: string;
  hsnSacCode?: string;
  quantity: number;
  rate: number;
  gstRate: 0 | 5 | 12 | 18 | 28;
}

export interface CreatePurchaseBillInput {
  vendorId: number;
  vendorBillNumber?: string;
  billDate: string;
  dueDate?: string;
  status: "DRAFT" | "POSTED";
  placeOfSupply?: string;
  vendorGstin?: string;
  supplierGstin?: string;
  reverseCharge: boolean;
  discount: number;
  notes?: string;
  expenseAccountCode: string;
  items: CreatePurchaseBillLine[];
}

interface PurchaseBillCreateResult {
  id: number;
  billNumber: string;
  status: PurchaseBillStatus;
}

export function useCreatePurchaseBill() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<PurchaseBillCreateResult, Error, CreatePurchaseBillInput>("accounting:journal:manage", {
    mutationKey: ["create", "purchase", "bill"],
    mutationFn: (input) => apiClient.post<PurchaseBillCreateResult>("/accounting/purchase-bills", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
    },
  });
}

export function usePostPurchaseBill(billId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ id: number; status: PurchaseBillStatus }, Error, void>("accounting:journal:manage", {
    mutationKey: ["post", "purchase", "bill"],
    mutationFn: () =>
      apiClient.patch<{ id: number; status: PurchaseBillStatus }>(`/accounting/purchase-bills/${billId}`, { status: "POSTED" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.purchaseBill(billId) });
    },
  });
}

export function useGstr3B(from: string, to: string) {
  return useQuery<Gstr3BReport, Error>({
    queryKey: queryKeys.accounting.gstr3B({ from, to }),
    queryFn: ({ signal }) => apiClient.get<Gstr3BReport>("/accounting/reports/gstr-3b", { from, to }, signal),
    enabled: !!from && !!to,
    staleTime: 30_000,
  });
}

interface ListVendorsOutstandingParams {
  cursor?: string;
  limit?: number;
  q?: string;
  onlyOutstanding?: boolean;
}

export function useVendorsOutstanding(params: ListVendorsOutstandingParams = {}) {
  return useQuery<CursorPage<VendorOutstanding>, Error>({
    queryKey: queryKeys.accounting.vendorsOutstanding(params),
    queryFn: ({ signal }) =>
      apiClient.get<CursorPage<VendorOutstanding>>("/accounting/vendors", toQuery(params), signal),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

interface VendorLedgerParams {
  from?: string;
  to?: string;
}

export function useVendorLedger(vendorId: number, params: VendorLedgerParams = {}) {
  return useQuery<VendorLedger, Error>({
    queryKey: queryKeys.accounting.vendorLedger(vendorId, params),
    queryFn: ({ signal }) =>
      apiClient.get<VendorLedger>(`/accounting/vendors/${vendorId}/ledger`, toQuery(params), signal),
    enabled: Number.isInteger(vendorId) && vendorId > 0,
    staleTime: 60_000,
  });
}

export function useAgedPayables(asOf: string) {
  return useQuery<AgedPayablesReport, Error>({
    queryKey: queryKeys.accounting.agedPayables({ asOf }),
    queryFn: ({ signal }) => apiClient.get<AgedPayablesReport>("/accounting/reports/aged-payables", { asOf }, signal),
    enabled: !!asOf,
    staleTime: 30_000,
  });
}

interface RecordVendorPaymentInput {
  amount: number;
  paymentDate: string;
  paymentMethod: "bank_transfer" | "upi" | "cheque" | "cash" | "card" | "other";
  referenceNumber?: string;
  notes?: string;
}

interface VendorPaymentResult {
  id: number;
  billId: number;
  amount: string;
  paymentDate: string;
  paymentMethod: string;
}

export function useRecordVendorPayment(billId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<VendorPaymentResult, Error, RecordVendorPaymentInput>("accounting:journal:manage", {
    mutationKey: ["record", "vendor", "payment"],
    mutationFn: (input) =>
      apiClient.post<VendorPaymentResult>(`/accounting/purchase-bills/${billId}/payments`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.purchaseBill(billId) });
    },
  });
}
