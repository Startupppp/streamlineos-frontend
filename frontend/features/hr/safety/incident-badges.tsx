import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { IncidentType, IncidentSeverity, IncidentStatus } from "@/hooks/api/hr/safety";

const STATUS_STYLES: Record<IncidentStatus, string> = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  investigating: "bg-amber-50 text-amber-700 border-amber-200",
  mitigated: "bg-teal-50 text-teal-700 border-teal-200",
  closed: "bg-slate-100 text-slate-600 border-slate-200",
};

const STATUS_LABELS: Record<IncidentStatus, string> = {
  open: "Open",
  investigating: "Investigating",
  mitigated: "Mitigated",
  closed: "Closed",
};

const SEVERITY_STYLES: Record<IncidentSeverity, string> = {
  low: "bg-slate-50 text-slate-600 border-slate-200",
  medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  critical: "bg-red-50 text-red-700 border-red-200",
};

const TYPE_LABELS: Record<IncidentType, string> = {
  injury: "Injury",
  accident: "Accident",
  near_miss: "Near Miss",
  hazard: "Hazard",
  environmental: "Environmental",
  other: "Other",
};

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function IncidentSeverityBadge({ severity }: { severity: IncidentSeverity }) {
  return (
    <Badge variant="outline" className={cn("text-xs font-medium capitalize", SEVERITY_STYLES[severity])}>
      {severity}
    </Badge>
  );
}

export function IncidentTypeLabel({ type }: { type: IncidentType }) {
  return <span className="text-sm">{TYPE_LABELS[type]}</span>;
}
