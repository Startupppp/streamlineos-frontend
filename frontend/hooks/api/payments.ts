"use client";

import type { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import {
  paymentCatalogContract,
  paymentProviderListContract,
  paymentProviderRowContract,
  credentialSaveContract,
  paymentDisconnectContract,
  paymentTestTransactionListContract,
  paymentTestTransactionContract,
  paymentTestTransactionCreatedContract,
  webhookEndpointContract,
  webhookEventListContract,
  webhookEventRowContract,
  paymentReadinessContract,
  paymentAuditListContract,
  webhookEventContract,
  paymentProviderWithCredentialsContract,
} from "@/hooks/api/payments-schema";

export type {
  ManualMethodType,
  ManualMethodStatus,
  PaymentManualMethod,
  SaveManualMethodPayload,
} from "./payments-manual-methods";
export {
  useManualMethods,
  useSaveManualMethod,
  useDisableManualMethod,
} from "./payments-manual-methods";

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

export type PaymentProvider = z.infer<typeof paymentProviderWithCredentialsContract>;

export function usePaymentCatalog() {
  const canView = useCan("payments:providers:view");
  return useQuery({
    queryKey: platformCoreQueryKeys.payments.catalog(),
    queryFn: ({ signal }) => apiClient.get("/payments/providers/catalog", undefined, signal, paymentCatalogContract),
    staleTime: 5 * 60_000,
    enabled: canView,
  });
}

export function usePaymentProviders() {
  const canView = useCan("payments:providers:view");
  return useQuery({
    queryKey: platformCoreQueryKeys.payments.providers(),
    queryFn: ({ signal }) => apiClient.get("/payments/providers", undefined, signal, paymentProviderListContract),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useCreatePaymentProvider() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payments:providers:manage", {
    mutationKey: ["create", "payment", "provider"],
    mutationFn: (providerKey: string) =>
      apiClient.post("/payments/providers", { providerKey }, undefined, paymentProviderRowContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: platformCoreQueryKeys.payments.providers() }),
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
      apiClient.post(
        `/payments/providers/${providerKey}/credentials`,
        payload, undefined, credentialSaveContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: platformCoreQueryKeys.payments.providers() });
      qc.invalidateQueries({ queryKey: platformCoreQueryKeys.payments.readiness(providerKey) });
    },
  });
}

export function useDisconnectPaymentCredentials(providerKey: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("payments:credentials:manage", {
    mutationKey: ["disconnect", "payment", "credentials"],
    mutationFn: (environment: PaymentEnvironment) =>
      apiClient.post(`/payments/providers/${providerKey}/disconnect`, { environment }, undefined, paymentDisconnectContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: platformCoreQueryKeys.payments.providers() });
      qc.invalidateQueries({ queryKey: platformCoreQueryKeys.payments.readiness(providerKey) });
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
    queryKey: platformCoreQueryKeys.payments.testTransactions(providerKey),
    queryFn: ({ signal }) => apiClient.get(`/payments/providers/${providerKey}/test-transactions`, undefined, signal, paymentTestTransactionListContract),
    staleTime: 15_000,
    enabled: canView && enabled,
  });
}

export function useCreateTestTransaction(providerKey: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("payments:test:run", {
    mutationKey: ["create", "test", "transaction"],
    mutationFn: (payload: { amount: string; currency: string }) =>
      apiClient.post(`/payments/providers/${providerKey}/test-transactions`, payload, undefined, paymentTestTransactionCreatedContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: platformCoreQueryKeys.payments.testTransactions(providerKey) }),
  });
}

export function useVerifyTestTransaction(providerKey: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("payments:test:run", {
    mutationKey: ["verify", "test", "transaction"],
    mutationFn: ({ id, providerPaymentId, signature }: { id: number; providerPaymentId: string; signature: string }) =>
      apiClient.patch(`/payments/providers/${providerKey}/test-transactions/${id}/verify`, {
        providerPaymentId,
        signature,
      }, undefined, paymentTestTransactionContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: platformCoreQueryKeys.payments.testTransactions(providerKey) });
      qc.invalidateQueries({ queryKey: platformCoreQueryKeys.payments.readiness(providerKey) });
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
      apiClient.post(`/payments/providers/${providerKey}/webhooks/generate`, { environment }, undefined, webhookEndpointContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: platformCoreQueryKeys.payments.readiness(providerKey) }),
  });
}

export type PaymentWebhookEvent = z.infer<typeof webhookEventContract>;

export function useWebhookEvents(providerKey: string, enabled = true) {
  const canView = useCan("payments:webhooks:view");
  return useQuery({
    queryKey: platformCoreQueryKeys.payments.webhookEvents(providerKey),
    queryFn: ({ signal }) => apiClient.get(`/payments/providers/${providerKey}/webhooks/events`, undefined, signal, webhookEventListContract),
    staleTime: 15_000,
    enabled: canView && enabled,
  });
}

export function useRetryWebhookEvent(providerKey: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("payments:webhooks:manage", {
    mutationKey: ["retry", "webhook", "event"],
    mutationFn: (eventId: number) =>
      apiClient.post(`/payments/providers/${providerKey}/webhooks/events/${eventId}/retry`, {}, undefined, webhookEventRowContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: platformCoreQueryKeys.payments.webhookEvents(providerKey) }),
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
    queryKey: platformCoreQueryKeys.payments.readiness(providerKey),
    queryFn: ({ signal }) => apiClient.get(`/payments/providers/${providerKey}/readiness`, undefined, signal, paymentReadinessContract),
    staleTime: 10_000,
    enabled: canView && enabled,
  });
}

export function useActivateLivePayments(providerKey: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("payments:live:activate", {
    mutationKey: ["activate", "live", "payments"],
    mutationFn: () => apiClient.post(`/payments/providers/${providerKey}/activate-live`, {}, undefined, paymentProviderRowContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: platformCoreQueryKeys.payments.providers() });
      qc.invalidateQueries({ queryKey: platformCoreQueryKeys.payments.readiness(providerKey) });
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
  const canView = useCan("payments:audit:view");
  return useQuery({
    queryKey: platformCoreQueryKeys.payments.audit(providerKey),
    queryFn: ({ signal }) => apiClient.get(`/payments/providers/${providerKey}/audit`, undefined, signal, paymentAuditListContract),
    staleTime: 30_000,
    enabled: canView && enabled,
  });
}
