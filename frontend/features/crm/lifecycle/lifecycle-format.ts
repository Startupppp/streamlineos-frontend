import type {
  CustomerHealthBand,
  CustomerLifecycleStatus,
  LifecycleRiskBand,
} from "@/types/crm/lifecycle";
import type { LifecycleSweepEntry } from "@/hooks/api/crm/lifecycle-schema";
import { formatMoneyRounded, formatRatioAsPercent } from "@/lib/format-utils";

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
  return formatMoneyRounded(value / 100, { currency, locale }, value % 100 === 0 ? 0 : 2);
}

export function formatBps(value: number, locale: string) {
  return formatRatioAsPercent(value / 10_000, locale, 0);
}

export function describeSweepEntry(entry: LifecycleSweepEntry): string {
  if (entry.action === "stood-down") return entry.reason ?? "Nothing due yet.";
  const opened = entry.action === "opened" ? "Opened a renewal opportunity" : "Re-offered the renewal";
  if (entry.outcome === "held") return `${opened}; a draft is waiting in its hold window.`;
  if (entry.outcome === "skipped") return `${opened}; the outbound loop declined: ${entry.reason ?? "no reason given"}.`;
  return `${opened}.`;
}
