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
import type { Decision } from "@/types/projects";
import type { NamedUser } from "@/lib/person-display";

const DEC_STATUS_LABEL: Record<string, string> = {
  proposed: "Proposed",
  accepted: "Accepted",
  superseded: "Superseded",
  revisit: "Revisit",
};

const DEC_STATUS_STYLE: Record<string, string> = {
  proposed: "text-status-info-ink-strong border-status-info-rule bg-status-info-surface",
  accepted:
    "text-status-success-ink-strong border-status-success-rule bg-status-success-surface",
  superseded: "text-muted-foreground border-border",
  revisit:
    "text-status-warning-ink-strong border-status-warning-rule bg-status-warning-surface",
};

export const DECISION_TABLE_HEADERS = [
  "ID",
  "Title",
  "Status",
  "Owner",
  "Decided",
  "Revisit",
  "Actions",
] as const;

export type DecisionOwnerLookup = (userId: string | null) => NamedUser | null;
export type DecisionMemberNameLookup = (userId: string | null) => string;

interface DecisionRowHandlers {
  canManage: boolean;
  memberName: DecisionMemberNameLookup;
  ownerOf: DecisionOwnerLookup;
  onEdit: (d: Decision) => void;
  onDelete: (d: Decision) => void;
}

function DecisionStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={`text-micro px-1.5 py-0.5 ${DEC_STATUS_STYLE[status] ?? "text-muted-foreground border-border"}`}
    >
      {DEC_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

export function DecisionRowActions({
  decision,
  onEdit,
  onDelete,
}: {
  decision: Decision;
  onEdit: (d: Decision) => void;
  onDelete: (d: Decision) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleEdit = useCallback(() => onEdit(decision), [decision, onEdit]);
  const handleDelete = useCallback(() => onDelete(decision), [decision, onDelete]);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-7"
          aria-label={`Actions for ${decision.title}`}
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

export function buildDecisionColumns({
  canManage,
  memberName,
  onEdit,
  onDelete,
}: DecisionRowHandlers): DataTableColumn<Decision>[] {
  return [
    {
      key: "decisionNumber",
      header: "ID",
      className: "w-20",
      cell: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          DEC-{row.decisionNumber}
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
      key: "status",
      header: "Status",
      cell: (row) => <DecisionStatusBadge status={row.status} />,
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
      key: "decidedAt",
      header: "Decided",
      cell: (row) => (
        <span className="text-dense tabular-nums text-muted-foreground">
          {row.decidedAt ? row.decidedAt.slice(0, 10) : "—"}
        </span>
      ),
    },
    {
      key: "revisitAt",
      header: "Revisit",
      cell: (row) => (
        <span className="text-dense tabular-nums text-muted-foreground">
          {row.revisitAt ? row.revisitAt.slice(0, 10) : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "sr-only",
      className: "w-10",
      cell: (row) =>
        canManage ? (
          <DecisionRowActions decision={row} onEdit={onEdit} onDelete={onDelete} />
        ) : null,
    },
  ];
}

export function DecisionMobileCard({
  decision,
  canManage,
  ownerOf,
  onEdit,
  onDelete,
}: {
  decision: Decision;
  canManage: boolean;
  ownerOf: DecisionOwnerLookup;
  onEdit: (d: Decision) => void;
  onDelete: (d: Decision) => void;
}) {
  return (
    <BuildMobileCard
      title={decision.title}
      status={<DecisionStatusBadge status={decision.status} />}
      person={{ user: ownerOf(decision.ownerId), role: "Owner" }}
      meta={[
        {
          label: "Decided",
          value: decision.decidedAt ? decision.decidedAt.slice(0, 10) : "—",
        },
        {
          label: "Revisit",
          value: decision.revisitAt ? decision.revisitAt.slice(0, 10) : "—",
        },
      ]}
      actions={
        canManage ? (
          <DecisionRowActions
            decision={decision}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ) : null
      }
    />
  );
}
