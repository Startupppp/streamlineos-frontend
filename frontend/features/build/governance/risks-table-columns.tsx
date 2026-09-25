"use client";

import { useCallback } from "react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import type { DataTableColumn } from "@/components/ui/data-table";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { Risk } from "@/types/projects";
import type { NamedUser } from "@/lib/person-display";
import { getRiskSeverity } from "./risk-severity";

const LEVEL_LABEL: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const LEVEL_STYLE: Record<string, string> = {
  low: "text-muted-foreground border-border",
  medium: "text-status-warning-ink-strong border-status-warning-rule bg-status-warning-surface",
  high: "text-status-danger-ink-strong border-status-danger-rule bg-status-danger-surface",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  mitigating: "Mitigating",
  monitoring: "Monitoring",
  accepted: "Accepted",
  closed: "Closed",
};

const STATUS_STYLE: Record<string, string> = {
  open: "text-primary border-border bg-primary/5 dark:bg-primary/10",
  mitigating:
    "text-status-warning-ink-strong border-status-warning-rule bg-status-warning-surface",
  monitoring: "text-primary border-border bg-primary/5 dark:bg-primary/10",
  accepted: "text-muted-foreground border-border",
  closed:
    "text-status-success-ink-strong border-status-success-rule bg-status-success-surface",
};

export const RISK_TABLE_HEADERS = [
  "ID",
  "Title",
  "Probability",
  "Impact",
  "Severity",
  "Owner",
  "Status",
  "Actions",
] as const;

export type RiskOwnerLookup = (userId: string | null) => NamedUser | null;
export type RiskMemberNameLookup = (userId: string | null) => string;

interface RiskRowHandlers {
  canManage: boolean;
  memberName: RiskMemberNameLookup;
  ownerOf: RiskOwnerLookup;
  onEdit: (r: Risk) => void;
  onDelete: (r: Risk) => void;
}

function RiskStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={`text-micro px-1.5 py-0.5 ${STATUS_STYLE[status] ?? "text-muted-foreground border-border"}`}
    >
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

export function RiskRowActions({
  risk,
  onEdit,
  onDelete,
}: {
  risk: Risk;
  onEdit: (r: Risk) => void;
  onDelete: (r: Risk) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleEdit = useCallback(() => onEdit(risk), [risk, onEdit]);
  const handleDelete = useCallback(() => onDelete(risk), [risk, onDelete]);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-7"
          aria-label={`Actions for ${risk.title}`}
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

export function buildRiskColumns({
  canManage,
  memberName,
  onEdit,
  onDelete,
}: RiskRowHandlers): DataTableColumn<Risk>[] {
  return [
    {
      key: "riskNumber",
      header: "ID",
      className: "w-20",
      cell: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          RISK-{row.riskNumber}
        </span>
      ),
    },
    {
      key: "title",
      header: "Title",
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <TruncatedText text={row.title} className="font-medium text-foreground" />
      ),
    },
    {
      key: "probability",
      header: "Probability",
      cell: (row) => (
        <Badge
          variant="outline"
          className={`text-micro px-1.5 py-0.5 ${LEVEL_STYLE[row.probability]}`}
        >
          {LEVEL_LABEL[row.probability]}
        </Badge>
      ),
    },
    {
      key: "impact",
      header: "Impact",
      cell: (row) => (
        <Badge
          variant="outline"
          className={`text-micro px-1.5 py-0.5 ${LEVEL_STYLE[row.impact]}`}
        >
          {LEVEL_LABEL[row.impact]}
        </Badge>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      cell: (row) => {
        const s = getRiskSeverity(row.probability, row.impact);
        return (
          <Badge
            variant="outline"
            className={`text-micro px-1.5 py-0.5 ${s.className}`}
          >
            {s.label}
          </Badge>
        );
      },
    },
    {
      key: "ownerId",
      header: "Owner",
      cell: (row) => (
        <span className="text-dense text-muted-foreground">
          {memberName(row.ownerId)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <RiskStatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "sr-only",
      className: "w-10",
      cell: (row) =>
        canManage ? (
          <RiskRowActions risk={row} onEdit={onEdit} onDelete={onDelete} />
        ) : null,
    },
  ];
}

export function RiskMobileCard({
  risk,
  canManage,
  ownerOf,
  onEdit,
  onDelete,
}: {
  risk: Risk;
  canManage: boolean;
  ownerOf: RiskOwnerLookup;
  onEdit: (r: Risk) => void;
  onDelete: (r: Risk) => void;
}) {
  const severity = getRiskSeverity(risk.probability, risk.impact);
  return (
    <BuildMobileCard
      title={risk.title}
      status={<RiskStatusBadge status={risk.status} />}
      person={{ user: ownerOf(risk.ownerId), role: "Owner" }}
      meta={[
        {
          label: "Severity",
          value: (
            <Badge
              variant="outline"
              className={`text-micro px-1.5 py-0.5 ${severity.className}`}
            >
              {severity.label}
            </Badge>
          ),
        },
        {
          label: "Prob / Impact",
          value: `${LEVEL_LABEL[risk.probability] ?? risk.probability} / ${LEVEL_LABEL[risk.impact] ?? risk.impact}`,
        },
      ]}
      actions={
        canManage ? (
          <RiskRowActions risk={risk} onEdit={onEdit} onDelete={onDelete} />
        ) : null
      }
    />
  );
}
