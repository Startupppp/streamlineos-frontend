import type {
  CustomerHealthBand,
  CustomerLifecycleStatus,
  LifecycleRiskBand,
} from "@/types/crm/lifecycle";

export const RISK_LABEL: Record<LifecycleRiskBand, string> = {
  healthy: "Healthy",
  watch: "Watch",
  "at-risk": "At risk",
};

export const HEALTH_LABEL: Record<CustomerHealthBand, string> = {
  healthy: "Healthy",
  at_risk: "At risk",
  critical: "Critical",
};

export const STATUS_LABEL: Record<CustomerLifecycleStatus, string> = {
  active: "Active",
  churned: "Churned",
  cancelled: "Cancelled",
};

export const RISK_TONE: Record<LifecycleRiskBand, string> = {
  healthy: "bg-status-success-surface text-status-success-ink",
  watch: "bg-status-warning-surface text-status-warning-ink",
  "at-risk": "bg-status-danger-surface text-status-danger-ink",
};

export const HEALTH_TONE: Record<CustomerHealthBand, string> = {
  healthy: "bg-status-success-surface text-status-success-ink",
  at_risk: "bg-status-warning-surface text-status-warning-ink",
  critical: "bg-status-danger-surface text-status-danger-ink",
};

export function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatMinor(value: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: value % 100 === 0 ? 0 : 2,
  }).format(value / 100);
}

export function formatBps(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value / 10_000);
}
