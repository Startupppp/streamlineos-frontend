"use client";

import { useCallback } from "react";
import Link from "next/link";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Button } from "@/components/ui/button";
import type { DataTableColumn } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import type { NamedUser } from "@/lib/person-display";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";
import type { Portfolio } from "@/types/projects";
import {
  PortfolioHealthBadge,
  PortfolioStatusBadge,
} from "./portfolio-status-badge";

export const PORTFOLIO_TABLE_HEADERS = [
  "Name",
  "Status",
  "Health",
  "Owner",
  "Projects",
  "Strategic goal",
  "Actions",
] as const;

export type PortfolioOwnerLookup = (ownerId: string | null) => NamedUser | null;

interface PortfolioRowHandlers {
  canManage: boolean;
  ownerOf: PortfolioOwnerLookup;
  onEdit: (row: Portfolio) => void;
  onDelete: (row: Portfolio) => void;
}

export function PortfolioRowActions({
  portfolio,
  onEdit,
  onDelete,
}: {
  portfolio: Portfolio;
  onEdit: (row: Portfolio) => void;
  onDelete: (row: Portfolio) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleEdit = useCallback(() => onEdit(portfolio), [portfolio, onEdit]);
  const handleDelete = useCallback(
    () => onDelete(portfolio),
    [portfolio, onDelete],
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-7"
          aria-label={`Actions for ${portfolio.name}`}
          {...hoverHandlers}
        >
          <EllipsisIcon ref={iconRef} size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={handleDelete}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ownerLabel(user: NamedUser | null): string {
  return user?.name ?? user?.email ?? "Unassigned";
}

export function buildPortfolioColumns({
  canManage,
  ownerOf,
  onEdit,
  onDelete,
}: PortfolioRowHandlers): DataTableColumn<Portfolio>[] {
  return [
    {
      key: "name",
      header: "Name",
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <Link
          href={`/build/portfolios/${row.id}`}
          className={cn(
            "font-medium text-foreground hover:text-primary",
            TEXT_ONE_LINE,
          )}
          title={row.name}
        >
          {row.name}
        </Link>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <PortfolioStatusBadge status={row.status} />,
    },
    {
      key: "health",
      header: "Health",
      cell: (row) => <PortfolioHealthBadge health={row.health} />,
    },
    {
      key: "ownerId",
      header: "Owner",
      cell: (row) => (
        <span
          className={cn(
            "max-w-[140px] text-sm text-muted-foreground",
            TEXT_ONE_LINE,
          )}
        >
          {ownerLabel(ownerOf(row.ownerId))}
        </span>
      ),
    },
    {
      key: "projectCount",
      header: "Projects",
      className: "w-20",
      cell: (row) => (
        <span className="font-mono tabular-nums text-muted-foreground">
          {row.projectCount ?? 0}
        </span>
      ),
    },
    {
      key: "strategicGoal",
      header: "Strategic goal",
      cell: (row) => (
        <span
          className={cn(
            "max-w-[200px] text-sm text-muted-foreground",
            TEXT_ONE_LINE,
          )}
          title={row.strategicGoal ?? undefined}
        >
          {row.strategicGoal ?? "—"}
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
          <PortfolioRowActions
            portfolio={row}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ) : null,
    },
  ];
}

export function PortfolioMobileCard({
  portfolio,
  canManage,
  ownerOf,
  onEdit,
  onDelete,
}: {
  portfolio: Portfolio;
} & PortfolioRowHandlers) {
  return (
    <BuildMobileCard
      title={portfolio.name}
      status={<PortfolioStatusBadge status={portfolio.status} />}
      person={{ user: ownerOf(portfolio.ownerId), role: "Owner" }}
      meta={[
        { label: "Health", value: <PortfolioHealthBadge health={portfolio.health} /> },
        { label: "Projects", value: portfolio.projectCount ?? 0 },
      ]}
      actions={
        canManage ? (
          <PortfolioRowActions
            portfolio={portfolio}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ) : null
      }
    />
  );
}
