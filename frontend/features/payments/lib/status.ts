import type { PaymentProviderStatus } from "@/hooks/api/payments";

export const PROVIDER_STATUS_LABELS: Record<PaymentProviderStatus, string> = {
  not_configured: "Not configured",
  test_mode_ready: "Test mode ready",
  needs_credentials: "Add credentials",
  needs_business_details: "Add business details",
  needs_kyc: "Complete verification",
  kyc_pending: "Verification pending",
  kyc_rejected: "Verification needs changes",
  needs_webhook: "Configure webhook",
  webhook_failing: "Webhook failing",
  test_payment_required: "Run test payment",
  ready_for_live: "Ready for live",
  live: "Live",
  degraded: "Needs attention",
  disabled: "Disabled",
};

type StatusTone = "neutral" | "info" | "warning" | "danger" | "success";

export const PROVIDER_STATUS_TONE: Record<PaymentProviderStatus, StatusTone> = {
  not_configured: "neutral",
  test_mode_ready: "info",
  needs_credentials: "warning",
  needs_business_details: "warning",
  needs_kyc: "warning",
  kyc_pending: "warning",
  kyc_rejected: "danger",
  needs_webhook: "warning",
  webhook_failing: "danger",
  test_payment_required: "warning",
  ready_for_live: "info",
  live: "success",
  degraded: "danger",
  disabled: "neutral",
};

export const STATUS_TONE_CLASSNAMES: Record<StatusTone, string> = {
  neutral: "text-muted-foreground border-border bg-muted/40",
  info: "text-status-info-ink border-status-info-rule bg-status-info-surface",
  warning: "text-status-warning-ink border-status-warning-rule bg-status-warning-surface",
  danger: "text-status-danger-ink border-status-danger-rule bg-status-danger-surface",
  success: "text-status-success-ink border-status-success-rule bg-status-success-surface",
};
