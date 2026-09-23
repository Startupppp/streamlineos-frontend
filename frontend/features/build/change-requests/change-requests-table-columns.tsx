"use client";

import { useCallback } from "react";
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
import type { ChangeRequest } from "@/types/projects";
import { CR_STATUS_LABELS } from "./change-request-schema";
import type { OrgMember } from "@/hooks/api/organization";

export const CHANGE_REQUESTS_TABLE_HEADERS = [
  "ID",
  "Title",
  "Status",
  "Est. (hrs)",
  "Budget",
  "Timeline",
  "Requester",
  "Actions",
] as const;

const CR_STATUS_STYLES: Record<string, string> = {
  submitted: "text-muted-foreground border-border",
  under_review: "text-status-info-ink border-status-info-rule",
  estimated: "text-status-warning-ink border-status-warning-rule",
  awaiting_approval: "text-status-warning-ink border-status-warning-rule",
  approved: "text-status-success-ink border-status-success-rule",
  rejected: "text-status-danger-ink border-status-danger-rule",
  in_progress: "text-status-info-ink border-status-info-rule",
  completed: "text-status-success-ink border-status-success-rule",
};

export function CrStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={`text-micro ${CR_STATUS_STYLES[status] ?? "text-muted-foreground border-border"}`}
    >
      {CR_STATUS_LABELS[status as keyof typeof CR_STATUS_LABELS] ?? status}
    </Badge>
  );
}

interface CrRowHandlers {
  canManage: boolean;
  members: OrgMember[];
  onEdit: (cr: ChangeRequest) => void;
  onDelete: (cr: ChangeRequest) => void;
}

export function CrRowActions({
  cr,
  onEdit,
  onDelete,
}: {
  cr: ChangeRequest;
  onEdit: (cr: ChangeRequest) => void;
  onDelete: (cr: ChangeRequest) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleEdit = useCallback(() => onEdit(cr), [cr, onEdit]);
  const handleDelete = useCallback(() => onDelete(cr), [cr, onDelete]);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-7"
          aria-label={`Actions for CR-${cr.crNumber}`}
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

export function buildChangeRequestsColumns({
  canManage,
  members,
  onEdit,
  onDelete,
}: CrRowHandlers): DataTableColumn<ChangeRequest>[] {
  return [
    {
      key: "crNumber",
      header: "ID",
      cell: (row) => (
        <span className="font-mono tabular-nums text-dense text-muted-foreground">
          CR-{row.crNumber}
        </span>
      ),
      className: "w-[72px]",
    },
    {
      key: "title",
      header: "Title",
      className: TABLE_TITLE_CELL,
      cell: (row) => <TruncatedText text={row.title} className="text-dense font-medium" />,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <CrStatusBadge status={row.status} />,
      className: "w-[140px]",
    },
    {
      key: "estimateMinutes",
      header: "Est. (hrs)",
      cell: (row) => (
        <span className="font-mono tabular-nums text-dense text-muted-foreground">
          {row.estimateMinutes != null ? (row.estimateMinutes / 60).toFixed(1) : "—"}
        </span>
      ),
      className: "w-[80px]",
    },
    {
      key: "budgetImpactCents",
      header: "Budget",
      cell: (row) => (
        <span className="font-mono tabular-nums text-dense text-muted-foreground">
          {row.budgetImpactCents != null
            ? `₹${(row.budgetImpactCents / 100).toLocaleString("en-IN")}`
            : "—"}
        </span>
      ),
      className: "w-[100px]",
    },
    {
      key: "timelineImpactDays",
      header: "Timeline",
      cell: (row) => (
        <span className="font-mono tabular-nums text-dense text-muted-foreground">
          {row.timelineImpactDays != null ? `${row.timelineImpactDays}d` : "—"}
        </span>
      ),
      className: "w-[80px]",
    },
    {
      key: "requestedById",
      header: "Requester",
      cell: (row) => {
        const m = members.find((member) => member.userId === row.requestedById);
        return (
          <span className="text-dense text-muted-foreground">
            {m ? (m.name ?? m.email) : "—"}
          </span>
        );
      },
      className: "w-[120px]",
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "sr-only",
      cell: (row) =>
        canManage ? (
          <CrRowActions cr={row} onEdit={onEdit} onDelete={onDelete} />
        ) : null,
      className: "w-[40px]",
    },
  ];
}

export function ChangeRequestMobileCard({
  cr,
  members,
  canManage,
  onEdit,
  onDelete,
}: { cr: ChangeRequest } & CrRowHandlers) {
  const requester = cr.requestedById
    ? members.find((m) => m.userId === cr.requestedById)
    : undefined;
  const personUser = requester ? { name: requester.name ?? null, email: requester.email } : null;
  return (
    <BuildMobileCard
      eyebrow={`CR-${cr.crNumber}`}
      title={cr.title}
      status={<CrStatusBadge status={cr.status} />}
      person={{ user: personUser, role: "Requester" }}
      meta={[
        {
          label: "Budget",
          value:
            cr.budgetImpactCents != null
              ? `₹${(cr.budgetImpactCents / 100).toLocaleString("en-IN")}`
              : "—",
        },
        {
          label: "Timeline",
          value: cr.timelineImpactDays != null ? `${cr.timelineImpactDays}d` : "—",
        },
      ]}
      actions={
        canManage ? <CrRowActions cr={cr} onEdit={onEdit} onDelete={onDelete} /> : null
      }
    />
  );
}
