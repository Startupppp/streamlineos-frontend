import { z } from "zod";

const publicCredentialContract = z.object({
  environment: z.enum(["test", "live"]),
  maskedKeyHint: z.string().nullable(),
  hasSecret: z.boolean(),
  hasWebhookSecret: z.boolean(),
  lastRotatedAt: z.string().nullable(),
});

export const paymentProviderRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  providerKey: z.string(),
  displayName: z.string(),
  status: z.enum(["not_configured", "test_mode_ready", "needs_credentials", "needs_business_details", "needs_kyc", "kyc_pending", "kyc_rejected", "needs_webhook", "webhook_failing", "test_payment_required", "ready_for_live", "live", "degraded", "disabled"]),
  environment: z.string(),
  isPrimary: z.boolean(),
  supportedCurrencies: z.array(z.string()),
  supportedPaymentMethods: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const paymentProviderWithCredentialsContract = paymentProviderRowContract.extend({
  credentials: z.array(publicCredentialContract),
});

export const paymentProviderListContract = z.array(paymentProviderWithCredentialsContract);

const catalogEntryContract = z.object({
  key: z.string(),
  displayName: z.string(),
  supportedCountries: z.array(z.string()),
  supportedCurrencies: z.array(z.string()),
  supportedPaymentMethods: z.array(z.string()),
  useCases: z.array(z.string()),
  credentialFields: z.array(z.string()),
  isImplemented: z.boolean(),
  expectedWebhookEvents: z.array(z.string()),
});

export const paymentCatalogContract = z.array(catalogEntryContract);

export const credentialSaveContract = z.object({
  credential: publicCredentialContract,
  warning: z.object({ code: z.string(), message: z.string() }).nullable(),
});

export const paymentDisconnectContract = z.object({ success: z.literal(true) });

export const paymentTestTransactionContract = z.object({
  id: z.number(),
  orgId: z.string(),
  providerId: z.number(),
  environment: z.string(),
  amount: z.string(),
  currency: z.string(),
  status: z.string(),
  providerOrderId: z.string().nullable(),
  providerPaymentId: z.string().nullable(),
  signatureVerified: z.boolean(),
  webhookReceived: z.boolean(),
  resultSummary: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
});

export const paymentTestTransactionCreatedContract = paymentTestTransactionContract.extend({
  keyId: z.string().nullable(),
});

export const paymentTestTransactionListContract = z.array(paymentTestTransactionContract);

export const webhookEndpointContract = z.object({
  id: z.number(),
  orgId: z.string(),
  providerId: z.number(),
  environment: z.string(),
  url: z.string(),
  expectedEvents: z.array(z.string()),
  status: z.string(),
  lastVerifiedAt: z.string().nullable(),
  lastFailureAt: z.string().nullable(),
  failureReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const webhookEventContract = z.object({
  id: z.number(),
  orgId: z.string(),
  providerId: z.number(),
  environment: z.string(),
  providerEventId: z.string(),
  eventType: z.string(),
  signatureValid: z.boolean(),
  processingStatus: z.string(),
  idempotencyKey: z.string(),
  relatedInvoiceId: z.number().nullable(),
  relatedSubscriptionId: z.string().nullable(),
  payloadRedacted: z.record(z.string(), z.unknown()),
  receivedAt: z.string(),
  processedAt: z.string().nullable(),
  errorMessage: z.string().nullable(),
});

export const webhookEventListContract = z.array(webhookEventContract);
export const webhookEventRowContract = webhookEventContract;

export const paymentReadinessContract = z.object({
  completedChecks: z.array(z.string()),
  blockers: z.array(z.string()),
  warnings: z.array(z.string()),
  readyForLive: z.boolean(),
});

const paymentAuditEventContract = z.object({
  id: z.number(),
  orgId: z.string(),
  actorUserId: z.string().nullable(),
  providerId: z.number().nullable(),
  action: z.string(),
  environment: z.string().nullable(),
  beforeRedacted: z.record(z.string(), z.unknown()).nullable(),
  afterRedacted: z.record(z.string(), z.unknown()).nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.string(),
});

export const paymentAuditListContract = z.array(paymentAuditEventContract);

export const paymentManualMethodContract = z.object({
  id: z.number(),
  orgId: z.string(),
  methodType: z.string(),
  displayName: z.string(),
  instructions: z.string().nullable(),
  bankName: z.string().nullable(),
  accountHolder: z.string().nullable(),
  maskedAccountNumber: z.string().nullable(),
  ifscSwiftIban: z.string().nullable(),
  upiId: z.string().nullable(),
  paymentReferenceInstructions: z.string().nullable(),
  requireManualApproval: z.boolean(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const paymentManualMethodListContract = z.array(paymentManualMethodContract);
