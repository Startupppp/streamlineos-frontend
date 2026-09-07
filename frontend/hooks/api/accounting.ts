"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { useCan } from "@/hooks/api/access";
import type {
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
import { useGatedQuery } from "@/hooks/api/gated-query";
import { toQuery, type CursorPage } from "@/hooks/api/accounting/cursor-page";
import {
  journalEntryListContract,
  journalEntryDetailContract,
  reverseJournalEntryContract,
  createJournalEntryContract,
  postJournalEntryContract,
  trialBalanceContract,
  profitLossContract,
  cashFlowContract,
  customerListContract,
  customerLedgerContract,
  gstr1Contract,
  balanceSheetContract,
  agedReceivablesContract,
  purchaseBillListContract,
  purchaseBillDetailContract,
  purchaseBillCreatedContract,
  billStatusUpdateContract,
  gstr3bContract,
  vendorListContract,
  vendorLedgerContract,
  agedPayablesContract,
  billPaymentCreatedContract,
} from "@/hooks/api/accounting/accounting-schema";

/**
 * The chart-of-accounts reads and writes moved to `accounting/chart-of-accounts.ts`
 * when this module passed the 500-line review limit; they are re-exported so the
 * ~30 call sites that import them from `@/hooks/api/accounting` keep working.
 */
export {
  useAccounts,
  useAllAccounts,
  useCreateAccount,
  useUpdateAccount,
  type ListAccountsParams,
} from "@/hooks/api/accounting/chart-of-accounts";
export type { CursorPage };

type CursorResponse<T> = CursorPage<T>;

interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface TrialBalanceResponse {
  asOf: string;
  rows: TrialBalanceRow[];
  totalDebit: string;
  totalCredit: string;
  balanced: boolean;
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
    queryKey: accountingAndSupportQueryKeys.accounting.journal(params),
    queryFn: ({ signal }) =>
      apiClient.get("/accounting/journal", toQuery(params), signal, journalEntryListContract),
    staleTime: 30_000,
    enabled: can,
  });
}

export function useJournalEntry(entryId: number) {
  return useGatedQuery<JournalEntry, Error>("accounting:journal:read", {
    queryKey: accountingAndSupportQueryKeys.accounting.journalEntry(entryId),
    queryFn: ({ signal }) => apiClient.get(`/accounting/journal/${entryId}`, undefined, signal, journalEntryDetailContract),
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
      apiClient.post(`/accounting/journal/${entryId}/reverse`, undefined, undefined, reverseJournalEntryContract),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.all });
      queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.journalEntry(entryId) });
      queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.journalEntry(result.id) });
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
    mutationFn: (input) => apiClient.post("/accounting/journal", input, undefined, createJournalEntryContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.all });
    },
  });
}

interface PostJournalEntryResult {
  id: number;
  entryNumber: string;
  status: string;
}

export function usePostJournalEntry(entryId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<PostJournalEntryResult, Error, void>("accounting:journal:manage", {
    mutationKey: ["post", "journal", "entry"],
    mutationFn: () => apiClient.post(`/accounting/journal/${entryId}/post`, undefined, undefined, postJournalEntryContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.all });
      queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.journalEntry(entryId) });
    },
  });
}

export function useTrialBalance(asOf: string) {
  return useGatedQuery<TrialBalanceResponse, Error>("accounting:reports:read", {
    queryKey: accountingAndSupportQueryKeys.accounting.trialBalance(asOf),
    queryFn: ({ signal }) =>
      apiClient.get("/accounting/reports/trial-balance", { asOf }, signal, trialBalanceContract),
    enabled: !!asOf,
    staleTime: 30_000,
  });
}

export function useProfitLoss(from: string, to: string) {
  return useGatedQuery<ProfitLossReport, Error>("accounting:reports:read", {
    queryKey: accountingAndSupportQueryKeys.accounting.profitLoss(from, to),
    queryFn: ({ signal }) =>
      apiClient.get("/accounting/reports/profit-loss", { from, to }, signal, profitLossContract),
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
  return useGatedQuery<CashFlowReport, Error>("accounting:reports:read", {
    queryKey: accountingAndSupportQueryKeys.accounting.cashFlow({ from, to }),
    queryFn: ({ signal }) => apiClient.get("/accounting/reports/cash-flow", { from, to }, signal, cashFlowContract),
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
  return useGatedQuery<CursorPage<CustomerOutstanding>, Error>("accounting:reports:read", {
    queryKey: accountingAndSupportQueryKeys.accounting.customersOutstanding(params),
    queryFn: ({ signal }) =>
      apiClient.get("/accounting/customers", toQuery(params), signal, customerListContract),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

interface CustomerLedgerParams {
  from?: string;
  to?: string;
}

export function useCustomerLedger(clientId: number, params: CustomerLedgerParams = {}) {
  return useGatedQuery<CustomerLedger, Error>("accounting:reports:read", {
    queryKey: accountingAndSupportQueryKeys.accounting.customerLedger(clientId, params),
    queryFn: ({ signal }) =>
      apiClient.get(`/accounting/customers/${clientId}/ledger`, toQuery(params), signal, customerLedgerContract),
    enabled: Number.isInteger(clientId) && clientId > 0,
    staleTime: 60_000,
  });
}

export function useGstr1(from: string, to: string) {
  return useGatedQuery<Gstr1Report, Error>("accounting:reports:read", {
    queryKey: accountingAndSupportQueryKeys.accounting.gstr1({ from, to }),
    queryFn: ({ signal }) => apiClient.get("/accounting/reports/gstr-1", { from, to }, signal, gstr1Contract),
    enabled: !!from && !!to,
    staleTime: 30_000,
  });
}

export function useBalanceSheet(asOf: string) {
  return useGatedQuery<BalanceSheetReport, Error>("accounting:reports:read", {
    queryKey: accountingAndSupportQueryKeys.accounting.balanceSheet({ asOf }),
    queryFn: ({ signal }) => apiClient.get("/accounting/reports/balance-sheet", { asOf }, signal, balanceSheetContract),
    enabled: !!asOf,
    staleTime: 30_000,
  });
}

export function useAgedReceivables(asOf: string) {
  return useGatedQuery<AgedReceivablesReport, Error>("accounting:reports:read", {
    queryKey: accountingAndSupportQueryKeys.accounting.agedReceivables({ asOf }),
    queryFn: ({ signal }) => apiClient.get("/accounting/reports/aged-receivables", { asOf }, signal, agedReceivablesContract),
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
  return useGatedQuery<CursorResponse<PurchaseBillSummary>, Error>("accounting:journal:read", {
    queryKey: accountingAndSupportQueryKeys.accounting.purchaseBills(params),
    queryFn: ({ signal }) =>
      apiClient.get("/accounting/purchase-bills", toQuery(params), signal, purchaseBillListContract),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function usePurchaseBill(billId: number) {
  return useGatedQuery<PurchaseBill, Error>("accounting:journal:read", {
    queryKey: accountingAndSupportQueryKeys.accounting.purchaseBill(billId),
    queryFn: ({ signal }) => apiClient.get(`/accounting/purchase-bills/${billId}`, undefined, signal, purchaseBillDetailContract),
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
  status: string;
}

export function useCreatePurchaseBill() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<PurchaseBillCreateResult, Error, CreatePurchaseBillInput>("accounting:journal:manage", {
    mutationKey: ["create", "purchase", "bill"],
    mutationFn: (input) => apiClient.post("/accounting/purchase-bills", input, undefined, purchaseBillCreatedContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.all });
    },
  });
}

export function usePostPurchaseBill(billId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ id: number; status: string }, Error, void>("accounting:journal:manage", {
    mutationKey: ["post", "purchase", "bill"],
    mutationFn: () =>
      apiClient.patch(`/accounting/purchase-bills/${billId}`, { status: "POSTED" }, undefined, billStatusUpdateContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.all });
      queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.purchaseBill(billId) });
    },
  });
}

export function useGstr3B(from: string, to: string) {
  return useGatedQuery<Gstr3BReport, Error>("accounting:reports:read", {
    queryKey: accountingAndSupportQueryKeys.accounting.gstr3B({ from, to }),
    queryFn: ({ signal }) => apiClient.get("/accounting/reports/gstr-3b", { from, to }, signal, gstr3bContract),
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
  return useGatedQuery<CursorPage<VendorOutstanding>, Error>("accounting:reports:read", {
    queryKey: accountingAndSupportQueryKeys.accounting.vendorsOutstanding(params),
    queryFn: ({ signal }) =>
      apiClient.get("/accounting/vendors", toQuery(params), signal, vendorListContract),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

interface VendorLedgerParams {
  from?: string;
  to?: string;
}

export function useVendorLedger(vendorId: number, params: VendorLedgerParams = {}) {
  return useGatedQuery<VendorLedger, Error>("accounting:reports:read", {
    queryKey: accountingAndSupportQueryKeys.accounting.vendorLedger(vendorId, params),
    queryFn: ({ signal }) =>
      apiClient.get(`/accounting/vendors/${vendorId}/ledger`, toQuery(params), signal, vendorLedgerContract),
    enabled: Number.isInteger(vendorId) && vendorId > 0,
    staleTime: 60_000,
  });
}

export function useAgedPayables(asOf: string) {
  return useGatedQuery<AgedPayablesReport, Error>("accounting:reports:read", {
    queryKey: accountingAndSupportQueryKeys.accounting.agedPayables({ asOf }),
    queryFn: ({ signal }) => apiClient.get("/accounting/reports/aged-payables", { asOf }, signal, agedPayablesContract),
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
      apiClient.post(`/accounting/purchase-bills/${billId}/payments`, input, undefined, billPaymentCreatedContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.all });
      queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.purchaseBill(billId) });
    },
  });
}
