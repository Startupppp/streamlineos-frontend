"use client";

import { useCallback } from "react";
import Link from "next/link";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DataTableColumn } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { Incident } from "@/types/projects";
import type { OrgMember } from "@/hooks/api/organization";
import { getSlaState } from "./sla";

export const INCIDENTS_TABLE_HEADERS = [
  "ID",
  "Title",
  "Severity",
  "Status",
  "SLA",
  "Owner",
  "Detected",
  "Actions",
] as const;

const SEVERITY_STYLES: Record<string, string> = {
  critical: "text-status-danger-ink border-status-danger-rule bg-status-danger-surface",
  high: "text-category-orange-ink border-category-orange-rule",
  medium: "text-status-warning-ink border-status-warning-rule",
  low: "text-muted-foreground border-border",
};

const STATUS_STYLES: Record<string, string> = {
  detected: "text-status-danger-ink border-status-danger-rule",
  investigating: "text-category-orange-ink border-category-orange-rule",
  mitigating: "text-status-warning-ink border-status-warning-rule",
  resolved: "text-status-success-ink border-status-success-rule",
  postmortem: "text-status-info-ink border-status-info-rule",
  closed: "text-muted-foreground border-border",
};

export const INCIDENT_STATUS_LABELS: Record<string, string> = {
  detected: "Detected",
  investigating: "Investigating",
  mitigating: "Mitigating",
  resolved: "Resolved",
  postmortem: "Post-mortem",
  closed: "Closed",
};

export function IncidentStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={`text-micro ${STATUS_STYLES[status] ?? "text-muted-foreground border-border"}`}
    >
      {INCIDENT_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

export function IncidentSeverityBadge({ severity }: { severity: string }) {
  return (
    <Badge
      variant="outline"
      className={`text-micro capitalize ${SEVERITY_STYLES[severity] ?? "text-muted-foreground border-border"}`}
    >
      {severity}
    </Badge>
  );
}

export function IncidentSlaBadge({ incident }: { incident: Incident }) {
  const state = getSlaState(incident);
  if (state.label === "Met")
    return (
      <Badge variant="outline" className="text-micro text-muted-foreground border-border">
        Met
      </Badge>
    );
  if (state.responseBreached || state.resolutionBreached)
    return (
      <Badge
        variant="outline"
        className="text-micro text-status-danger-ink border-status-danger-rule bg-status-danger-surface"
      >
        Breached
      </Badge>
    );
  return (
    <Badge
      variant="outline"
      className="text-micro text-status-success-ink border-status-success-rule"
    >
      On track
    </Badge>
  );
}

interface IncidentRowHandlers {
  canManage: boolean;
  members: OrgMember[];
  projectId: number;
  onEdit: (i: Incident) => void;
  onDelete: (i: Incident) => void;
}

export function IncidentRowActions({
  incident,
  onEdit,
  onDelete,
}: {
  incident: Incident;
  onEdit: (i: Incident) => void;
  onDelete: (i: Incident) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleEdit = useCallback(() => onEdit(incident), [incident, onEdit]);
  const handleDelete = useCallback(() => onDelete(incident), [incident, onDelete]);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-7"
          aria-label={`Actions for INC-${incident.incidentNumber}`}
          {...hoverHandlers}
        >
          <EllipsisIcon ref={iconRef} size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={handleEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={handleDelete}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function buildIncidentsColumns({
  canManage,
  members,
  projectId,
  onEdit,
  onDelete,
}: IncidentRowHandlers): DataTableColumn<Incident>[] {
  return [
    {
      key: "incidentNumber",
      header: "ID",
      cell: (row) => (
        <Link
          href={`/build/${projectId}/incidents/${row.id}`}
          className="font-mono tabular-nums text-dense text-primary hover:underline"
        >
          INC-{row.incidentNumber}
        </Link>
      ),
      className: "w-[80px]",
    },
    {
      key: "title",
      header: "Title",
      className: TABLE_TITLE_CELL,
      cell: (row) => <TruncatedText text={row.title} className="text-dense font-medium" />,
    },
    {
      key: "severity",
      header: "Severity",
      cell: (row) => <IncidentSeverityBadge severity={row.severity} />,
      className: "w-[90px]",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <IncidentStatusBadge status={row.status} />,
      className: "w-[110px]",
    },
    {
      key: "sla",
      header: "SLA",
      cell: (row) => <IncidentSlaBadge incident={row} />,
      className: "w-[90px]",
    },
    {
      key: "owner",
      header: "Owner",
      cell: (row) => {
        const member = members.find((m) => m.userId === row.ownerId);
        return (
          <span className="text-dense text-muted-foreground">
            {member ? (member.name ?? member.email) : "—"}
          </span>
        );
      },
      className: "w-[120px]",
    },
    {
      key: "detectedAt",
      header: "Detected",
      cell: (row) => (
        <span className="font-mono tabular-nums text-dense text-muted-foreground">
          {row.detectedAt ? new Date(row.detectedAt).toLocaleDateString() : "—"}
        </span>
      ),
      className: "w-[100px]",
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "sr-only",
      cell: (row) =>
        canManage ? (
          <IncidentRowActions incident={row} onEdit={onEdit} onDelete={onDelete} />
        ) : null,
      className: "w-[40px]",
    },
  ];
}

export function IncidentMobileCard({
  incident,
  members,
  canManage,
  onEdit,
  onDelete,
}: {
  incident: Incident;
  members: OrgMember[];
  canManage: boolean;
  onEdit: (i: Incident) => void;
  onDelete: (i: Incident) => void;
}) {
  const owner = incident.ownerId
    ? members.find((m) => m.userId === incident.ownerId)
    : undefined;
  const personUser = owner ? { name: owner.name ?? null, email: owner.email } : null;
  return (
    <BuildMobileCard
      eyebrow={`INC-${incident.incidentNumber}`}
      title={incident.title}
      status={<IncidentStatusBadge status={incident.status} />}
      person={{ user: personUser, role: "Owner" }}
      meta={[
        { label: "Severity", value: <IncidentSeverityBadge severity={incident.severity} /> },
        { label: "SLA", value: <IncidentSlaBadge incident={incident} /> },
      ]}
      actions={
        canManage ? (
          <IncidentRowActions incident={incident} onEdit={onEdit} onDelete={onDelete} />
        ) : null
      }
    />
  );
}
