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
  info: "text-blue-700 border-blue-200 bg-blue-50 dark:text-blue-300 dark:border-blue-500/30 dark:bg-blue-500/10",
  warning: "text-amber-700 border-amber-200 bg-amber-50 dark:text-amber-300 dark:border-amber-500/30 dark:bg-amber-500/10",
  danger: "text-rose-700 border-rose-200 bg-rose-50 dark:text-rose-300 dark:border-rose-500/30 dark:bg-rose-500/10",
  success: "text-emerald-700 border-emerald-200 bg-emerald-50 dark:text-emerald-300 dark:border-emerald-500/30 dark:bg-emerald-500/10",
};
