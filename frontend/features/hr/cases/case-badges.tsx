import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CaseCategory, CaseSeverity, CaseStatus } from "@/hooks/api/hr/cases";

const STATUS_STYLES: Record<CaseStatus, string> = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  under_investigation: "bg-amber-50 text-amber-700 border-amber-200",
  resolved: "bg-green-50 text-green-700 border-green-200",
  closed: "bg-slate-100 text-slate-600 border-slate-200",
  dismissed: "bg-slate-100 text-slate-500 border-slate-200",
};

const STATUS_LABELS: Record<CaseStatus, string> = {
  open: "Open",
  under_investigation: "Under Investigation",
  resolved: "Resolved",
  closed: "Closed",
  dismissed: "Dismissed",
};

const SEVERITY_STYLES: Record<CaseSeverity, string> = {
  low: "bg-slate-50 text-slate-600 border-slate-200",
  medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  critical: "bg-red-50 text-red-700 border-red-200",
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
    <Badge variant="outline" className={cn("text-xs font-medium capitalize", STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function CaseSeverityBadge({ severity }: { severity: CaseSeverity }) {
  return (
    <Badge variant="outline" className={cn("text-xs font-medium capitalize", SEVERITY_STYLES[severity])}>
      {severity}
    </Badge>
  );
}

export function CaseCategoryLabel({ category }: { category: CaseCategory }) {
  return <span className="text-sm text-foreground">{CATEGORY_LABELS[category]}</span>;
}
