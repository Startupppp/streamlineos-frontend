import { SemanticBadge } from "@/components/ui/semantic-badge";
import type { BadgeTone } from "@/components/ui/semantic-badge";
import type { IncidentType, IncidentSeverity, IncidentStatus } from "@/hooks/api/hr/safety";

const STATUS_TONES: Record<IncidentStatus, BadgeTone> = {
  open: "info",
  investigating: "warning",
  mitigated: "teal",
  closed: "neutral",
};

const STATUS_LABELS: Record<IncidentStatus, string> = {
  open: "Open",
  investigating: "Investigating",
  mitigated: "Mitigated",
  closed: "Closed",
};

const SEVERITY_TONES: Record<IncidentSeverity, BadgeTone> = {
  low: "neutral",
  medium: "yellow",
  high: "orange",
  critical: "danger",
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
    <SemanticBadge
      tone={STATUS_TONES[status]}
      label={STATUS_LABELS[status]}
      className="rounded-full"
    />
  );
}

export function IncidentSeverityBadge({ severity }: { severity: IncidentSeverity }) {
  return (
    <SemanticBadge
      tone={SEVERITY_TONES[severity]}
      label={severity}
      className="rounded-full capitalize"
    />
  );
}

export function IncidentTypeLabel({ type }: { type: IncidentType }) {
  return <span className="text-sm">{TYPE_LABELS[type]}</span>;
}
