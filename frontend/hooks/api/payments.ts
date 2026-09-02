"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import { queryKeys } from "@/lib/query-keys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export type PaymentEnvironment = "test" | "live";

export type PaymentProviderCatalogEntry = {
  key: string;
  displayName: string;
  supportedCountries: string[];
  supportedCurrencies: string[];
  supportedPaymentMethods: string[];
  useCases: string[];
  credentialFields: string[];
  isImplemented: boolean;
  expectedWebhookEvents: string[];
};

export type PaymentProviderCredentialPublic = {
  environment: PaymentEnvironment;
  maskedKeyHint: string | null;
  hasSecret: boolean;
  hasWebhookSecret: boolean;
  lastRotatedAt: string | null;
};

export type PaymentProviderStatus =
  | "not_configured"
  | "test_mode_ready"
  | "needs_credentials"
  | "needs_business_details"
  | "needs_kyc"
  | "kyc_pending"
  | "kyc_rejected"
  | "needs_webhook"
  | "webhook_failing"
  | "test_payment_required"
  | "ready_for_live"
  | "live"
  | "degraded"
  | "disabled";

export type PaymentProvider = {
  id: number;
  providerKey: string;
  displayName: string;
  status: PaymentProviderStatus;
  environment: PaymentEnvironment;
  isPrimary: boolean;
  supportedCurrencies: string[];
  supportedPaymentMethods: string[];
  credentials: PaymentProviderCredentialPublic[];
};

export function usePaymentCatalog() {
  const canView = useCan("payments:providers:view");
  return useQuery({
    queryKey: queryKeys.payments.catalog(),
    queryFn: ({ signal }) => apiClient.get<PaymentProviderCatalogEntry[]>("/payments/providers/catalog", undefined, signal),
    staleTime: 5 * 60_000,
    enabled: canView,
  });
}

export function usePaymentProviders() {
  const canView = useCan("payments:providers:view");
  return useQuery({
    queryKey: queryKeys.payments.providers(),
    queryFn: ({ signal }) => apiClient.get<PaymentProvider[]>("/payments/providers", undefined, signal),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useCreatePaymentProvider() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payments:providers:manage", {
    mutationKey: ["create", "payment", "provider"],
    mutationFn: (providerKey: string) =>
      apiClient.post<PaymentProvider>("/payments/providers", { providerKey }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.payments.providers() }),
  });
}

export type SaveCredentialsPayload = {
  environment: PaymentEnvironment;
  keyId?: string;
  secret?: string;
  webhookSecret?: string;
};

export function useSavePaymentCredentials(providerKey: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("payments:credentials:manage", {
    mutationKey: ["save", "payment", "credentials"],
    mutationFn: (payload: SaveCredentialsPayload) =>
      apiClient.post<{ credential: PaymentProviderCredentialPublic; warning: { code: string; message: string } | null }>(
        `/payments/providers/${providerKey}/credentials`,
        payload,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payments.providers() });
      qc.invalidateQueries({ queryKey: queryKeys.payments.readiness(providerKey) });
    },
  });
}

export function useDisconnectPaymentCredentials(providerKey: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("payments:credentials:manage", {
    mutationKey: ["disconnect", "payment", "credentials"],
    mutationFn: (environment: PaymentEnvironment) =>
      apiClient.post(`/payments/providers/${providerKey}/disconnect`, { environment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payments.providers() });
      qc.invalidateQueries({ queryKey: queryKeys.payments.readiness(providerKey) });
    },
  });
}

export type PaymentTestTransaction = {
  id: number;
  environment: PaymentEnvironment;
  amount: string;
  currency: string;
  status: "created" | "pending" | "succeeded" | "failed";
  providerOrderId: string | null;
  providerPaymentId: string | null;
  signatureVerified: boolean;
  webhookReceived: boolean;
  resultSummary: string | null;
  createdAt: string;
  keyId?: string;
};

export function useTestTransactions(providerKey: string, enabled = true) {
  const canView = useCan("payments:providers:view");
  return useQuery({
    queryKey: queryKeys.payments.testTransactions(providerKey),
    queryFn: ({ signal }) => apiClient.get<PaymentTestTransaction[]>(`/payments/providers/${providerKey}/test-transactions`, undefined, signal),
    staleTime: 15_000,
    enabled: canView && enabled,
  });
}

export function useCreateTestTransaction(providerKey: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("payments:test:run", {
    mutationKey: ["create", "test", "transaction"],
    mutationFn: (payload: { amount: string; currency: string }) =>
      apiClient.post<PaymentTestTransaction>(`/payments/providers/${providerKey}/test-transactions`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.payments.testTransactions(providerKey) }),
  });
}

export function useVerifyTestTransaction(providerKey: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("payments:test:run", {
    mutationKey: ["verify", "test", "transaction"],
    mutationFn: ({ id, providerPaymentId, signature }: { id: number; providerPaymentId: string; signature: string }) =>
      apiClient.patch<PaymentTestTransaction>(`/payments/providers/${providerKey}/test-transactions/${id}/verify`, {
        providerPaymentId,
        signature,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payments.testTransactions(providerKey) });
      qc.invalidateQueries({ queryKey: queryKeys.payments.readiness(providerKey) });
    },
  });
}

export type PaymentWebhookEndpoint = {
  id: number;
  environment: PaymentEnvironment;
  url: string;
  expectedEvents: string[];
  status: "not_verified" | "verified" | "failing";
  lastVerifiedAt: string | null;
  lastFailureAt: string | null;
  failureReason: string | null;
};

export function useGenerateWebhook(providerKey: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("payments:webhooks:manage", {
    mutationKey: ["generate", "webhook"],
    mutationFn: (environment: PaymentEnvironment) =>
      apiClient.post<PaymentWebhookEndpoint>(`/payments/providers/${providerKey}/webhooks/generate`, { environment }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.payments.readiness(providerKey) }),
  });
}

export type PaymentWebhookEvent = {
  id: number;
  environment: PaymentEnvironment;
  providerEventId: string;
  eventType: string;
  signatureValid: boolean;
  processingStatus: "received" | "processed" | "failed" | "ignored_duplicate";
  payloadRedacted: Record<string, unknown>;
  receivedAt: string;
  processedAt: string | null;
  errorMessage: string | null;
};

export function useWebhookEvents(providerKey: string, enabled = true) {
  const canView = useCan("payments:providers:view");
  return useQuery({
    queryKey: queryKeys.payments.webhookEvents(providerKey),
    queryFn: ({ signal }) => apiClient.get<PaymentWebhookEvent[]>(`/payments/providers/${providerKey}/webhooks/events`, undefined, signal),
    staleTime: 15_000,
    enabled: canView && enabled,
  });
}

export function useRetryWebhookEvent(providerKey: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("payments:webhooks:manage", {
    mutationKey: ["retry", "webhook", "event"],
    mutationFn: (eventId: number) =>
      apiClient.post(`/payments/providers/${providerKey}/webhooks/events/${eventId}/retry`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.payments.webhookEvents(providerKey) }),
  });
}

export type PaymentReadiness = {
  completedChecks: string[];
  blockers: string[];
  warnings: string[];
  readyForLive: boolean;
};

export function usePaymentReadiness(providerKey: string, enabled = true) {
  const canView = useCan("payments:providers:view");
  return useQuery({
    queryKey: queryKeys.payments.readiness(providerKey),
    queryFn: ({ signal }) => apiClient.get<PaymentReadiness>(`/payments/providers/${providerKey}/readiness`, undefined, signal),
    staleTime: 10_000,
    enabled: canView && enabled,
  });
}

export function useActivateLivePayments(providerKey: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("payments:live:activate", {
    mutationKey: ["activate", "live", "payments"],
    mutationFn: () => apiClient.post<PaymentProvider>(`/payments/providers/${providerKey}/activate-live`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payments.providers() });
      qc.invalidateQueries({ queryKey: queryKeys.payments.readiness(providerKey) });
    },
  });
}

export type PaymentAuditEvent = {
  id: number;
  actorUserId: string | null;
  providerId: number | null;
  action: string;
  environment: PaymentEnvironment | null;
  beforeRedacted: Record<string, unknown> | null;
  afterRedacted: Record<string, unknown> | null;
  createdAt: string;
};

export function usePaymentAudit(providerKey: string, enabled = true) {
  const canView = useCan("payments:providers:view");
  return useQuery({
    queryKey: queryKeys.payments.audit(providerKey),
    queryFn: ({ signal }) => apiClient.get<PaymentAuditEvent[]>(`/payments/providers/${providerKey}/audit`, undefined, signal),
    staleTime: 30_000,
    enabled: canView && enabled,
  });
}

export type ManualMethodType = "bank_transfer" | "upi" | "cheque" | "cash" | "other";
export type ManualMethodStatus = "enabled" | "missing_instructions" | "disabled";

export type PaymentManualMethod = {
  id: number;
  methodType: ManualMethodType;
  displayName: string;
  instructions: string | null;
  bankName: string | null;
  accountHolder: string | null;
  maskedAccountNumber: string | null;
  ifscSwiftIban: string | null;
  upiId: string | null;
  paymentReferenceInstructions: string | null;
  requireManualApproval: boolean;
  status: ManualMethodStatus;
};

export type SaveManualMethodPayload = {
  methodType: ManualMethodType;
  displayName: string;
  instructions?: string;
  bankName?: string;
  accountHolder?: string;
  maskedAccountNumber?: string;
  ifscSwiftIban?: string;
  upiId?: string;
  paymentReferenceInstructions?: string;
  requireManualApproval?: boolean;
};

export function useManualMethods() {
  const canView = useCan("payments:providers:view");
  return useQuery({
    queryKey: [...queryKeys.payments.all, "manual-methods"],
    queryFn: ({ signal }) => apiClient.get<PaymentManualMethod[]>("/payments/manual-methods", undefined, signal),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useSaveManualMethod() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payments:manual-methods:manage", {
    mutationKey: ["save", "manual", "method"],
    mutationFn: (payload: SaveManualMethodPayload) =>
      apiClient.post<PaymentManualMethod>("/payments/manual-methods", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.payments.all, "manual-methods"] }),
  });
}

export function useDisableManualMethod() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payments:manual-methods:manage", {
    mutationKey: ["disable", "manual", "method"],
    mutationFn: (id: number) => apiClient.post(`/payments/manual-methods/${id}/disable`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.payments.all, "manual-methods"] }),
  });
}
