import type { StatusTone } from "@/lib/design-tokens";
import type { SubmissionRow } from "./product-feedback-columns";

const CHANNEL_LABELS: Record<string, string> = {
  feedbucket: "Feedbucket",
  widget: "Widget",
  email: "Email",
  support: "Support",
  sales: "Sales",
  interview: "Interview",
  survey: "Survey",
  public_portal: "Portal",
  manual: "Manual",
  import: "Import",
};

export const SENTIMENT_LABELS: Record<string, string> = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
  mixed: "Mixed",
};

export const CONSENT_LABELS: Record<string, string> = {
  granted: "Granted",
  denied: "Denied",
  unknown: "Unknown",
};

export const SENTIMENT_TONE: Record<string, StatusTone> = {
  positive: "success",
  neutral: "neutral",
  negative: "danger",
  mixed: "warning",
};

export const CONSENT_TONE: Record<string, StatusTone> = {
  granted: "success",
  denied: "danger",
  unknown: "neutral",
};

export const CHANNEL_TONE: Record<string, StatusTone> = {
  feedbucket: "info",
  widget: "info",
  email: "neutral",
  support: "neutral",
  sales: "neutral",
  interview: "info",
  survey: "info",
  public_portal: "neutral",
  manual: "neutral",
  import: "neutral",
};

export const TYPE_TONE: Record<string, StatusTone> = {
  bug: "danger",
  idea: "info",
  feature: "info",
  question: "neutral",
  praise: "success",
  other: "neutral",
};

export const STATUS_TONE: Record<string, StatusTone> = {
  open: "info",
  in_progress: "warning",
  resolved: "success",
  archived: "neutral",
};

export function submissionFrequency(duplicateCount: number | null | undefined): number {
  return typeof duplicateCount === "number" ? duplicateCount + 1 : 1;
}

export function frequencyTone(frequency: number): StatusTone {
  if (frequency >= 5) return "warning";
  if (frequency >= 2) return "info";
  return "neutral";
}

export function frequencyLabel(frequency: number): string {
  return frequency === 1 ? "1 report" : `${frequency} reports`;
}

export function channelLabel(channel: string | null | undefined): string | null {
  if (!channel) return null;
  return CHANNEL_LABELS[channel] ?? channel.replaceAll("_", " ");
}

export function resolveProductFeedbackSubmissionHref(
  row: SubmissionRow,
  managedProductId: number,
  canOpenDetail: boolean,
): string | null {
  const projectId = row.widget?.projectId;
  const owningManagedProductId = row.widget?.managedProductId;
  if (
    !canOpenDetail ||
    !Number.isSafeInteger(row.id) ||
    row.id <= 0 ||
    !Number.isSafeInteger(projectId) ||
    (projectId ?? 0) <= 0 ||
    owningManagedProductId !== managedProductId
  ) {
    return null;
  }
  return `/build/${projectId}/feedbucket/${row.id}`;
}
