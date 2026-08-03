import { SemanticBadge } from "@/components/ui/semantic-badge";
import type { BadgeTone } from "@/components/ui/semantic-badge";
import type {
  CaseCategory,
  CaseSeverity,
  CaseStatus,
} from "@/hooks/api/hr/cases";

const STATUS_TONES: Record<CaseStatus, BadgeTone> = {
  open: "info",
  under_investigation: "warning",
  resolved: "green",
  closed: "neutral",
  dismissed: "neutral",
};

const STATUS_LABELS: Record<CaseStatus, string> = {
  open: "Open",
  under_investigation: "Under Investigation",
  resolved: "Resolved",
  closed: "Closed",
  dismissed: "Dismissed",
};

const SEVERITY_TONES: Record<CaseSeverity, BadgeTone> = {
  low: "neutral",
  medium: "yellow",
  high: "orange",
  critical: "danger",
};

const CATEGORY_LABELS: Record<CaseCategory, string> = {
  grievance: "Grievance",
  disciplinary: "Disciplinary",
  harassment: "Harassment",
  ethics: "Ethics",
  performance: "Performance",
  workplace_conflict: "Workplace Conflict",
  policy_violation: "Policy Violation",
  other: "Other",
};

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  return (
    <SemanticBadge
      tone={STATUS_TONES[status]}
      label={STATUS_LABELS[status]}
      className="rounded-full capitalize"
    />
  );
}

export function CaseSeverityBadge({ severity }: { severity: CaseSeverity }) {
  return (
    <SemanticBadge
      tone={SEVERITY_TONES[severity]}
      label={severity}
      className="rounded-full capitalize"
    />
  );
}

export function CaseCategoryLabel({ category }: { category: CaseCategory }) {
  return (
    <span className="text-sm text-foreground">{CATEGORY_LABELS[category]}</span>
  );
}
