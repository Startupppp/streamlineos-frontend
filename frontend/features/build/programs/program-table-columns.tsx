"use client";

import { useCallback } from "react";
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
import type { Program } from "@/types/projects";
import {
  PortfolioHealthBadge,
  PortfolioStatusBadge,
} from "@/features/build/portfolios/portfolio-status-badge";

export const PROGRAM_TABLE_HEADERS = [
  "Name",
  "Status",
  "Health",
  "Portfolio",
  "Owner",
  "Projects",
  "Actions",
] as const;

export type ProgramOwnerLookup = (ownerId: string | null) => NamedUser | null;
export type ProgramPortfolioLookup = (portfolioId: number | null) => string;

interface ProgramRowHandlers {
  canManage: boolean;
  ownerOf: ProgramOwnerLookup;
  portfolioName: ProgramPortfolioLookup;
  onEdit: (row: Program) => void;
  onDelete: (row: Program) => void;
}

function ownerLabel(user: NamedUser | null): string {
  return user?.name ?? user?.email ?? "Unassigned";
}

export function ProgramRowActions({
  program,
  onEdit,
  onDelete,
}: {
  program: Program;
  onEdit: (row: Program) => void;
  onDelete: (row: Program) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleEdit = useCallback(() => onEdit(program), [program, onEdit]);
  const handleDelete = useCallback(() => onDelete(program), [program, onDelete]);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-7"
          aria-label={`Actions for ${program.name}`}
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

export function buildProgramColumns({
  canManage,
  ownerOf,
  portfolioName,
  onEdit,
  onDelete,
}: ProgramRowHandlers): DataTableColumn<Program>[] {
  return [
    {
      key: "name",
      header: "Name",
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <span
          className={cn("font-medium text-foreground", TEXT_ONE_LINE)}
          title={row.name}
        >
          {row.name}
        </span>
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
      key: "portfolioId",
      header: "Portfolio",
      cell: (row) => (
        <span
          className={cn("max-w-[160px] text-sm text-muted-foreground", TEXT_ONE_LINE)}
        >
          {portfolioName(row.portfolioId)}
        </span>
      ),
    },
    {
      key: "ownerId",
      header: "Owner",
      cell: (row) => (
        <span
          className={cn("max-w-[140px] text-sm text-muted-foreground", TEXT_ONE_LINE)}
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
      key: "actions",
      header: "Actions",
      headerClassName: "sr-only",
      className: "w-10",
      cell: (row) =>
        canManage ? (
          <ProgramRowActions program={row} onEdit={onEdit} onDelete={onDelete} />
        ) : null,
    },
  ];
}

export function ProgramMobileCard({
  program,
  canManage,
  ownerOf,
  portfolioName,
  onEdit,
  onDelete,
}: { program: Program } & ProgramRowHandlers) {
  return (
    <BuildMobileCard
      title={program.name}
      status={<PortfolioStatusBadge status={program.status} />}
      person={{ user: ownerOf(program.ownerId), role: "Owner" }}
      meta={[
        { label: "Portfolio", value: portfolioName(program.portfolioId) },
        { label: "Projects", value: program.projectCount ?? 0 },
      ]}
      actions={
        canManage ? (
          <ProgramRowActions
            program={program}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ) : null
      }
    />
  );
}
