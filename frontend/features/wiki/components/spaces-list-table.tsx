"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table.types";
import { spaceHref } from "@/lib/knowledge-routes";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import {
  KbArchiveIcon,
  KbPencilIcon,
  KbRotateCcwIcon,
  KbUsersIcon,
} from "@/features/wiki/lib/kb-icons";
import type { KbAudience } from "@/types/kb";
import type { KbSpaceListItem } from "@/hooks/api/kb/spaces";
import { SpaceCard } from "./space-card";

const AUDIENCE_LABELS: Record<KbAudience, string> = {
  internal: "Internal",
  public: "Public",
  mixed: "Mixed",
};

interface SpaceRowActionsProps {
  space: KbSpaceListItem;
  onEdit: (space: KbSpaceListItem) => void;
  onArchiveToggle: (space: KbSpaceListItem) => void;
  onViewMembers: (space: KbSpaceListItem) => void;
}

function SpaceRowActions({
  space,
  onEdit,
  onArchiveToggle,
  onViewMembers,
}: SpaceRowActionsProps) {
  const isArchived = space.archivedAt !== null;

  function handleEdit() {
    onEdit(space);
  }

  function handleArchiveToggle() {
    onArchiveToggle(space);
  }

  function handleViewMembers() {
    onViewMembers(space);
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label={`Members of ${space.name}`}
        onClick={handleViewMembers}
      >
        <KbUsersIcon className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label={`Edit ${space.name}`}
        onClick={handleEdit}
      >
        <KbPencilIcon className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label={
          isArchived ? `Restore ${space.name}` : `Archive ${space.name}`
        }
        onClick={handleArchiveToggle}
      >
        {isArchived ? (
          <KbRotateCcwIcon className="h-4 w-4" />
        ) : (
          <KbArchiveIcon className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

function buildColumns(
  canManage: boolean,
  onEdit: (space: KbSpaceListItem) => void,
  onArchiveToggle: (space: KbSpaceListItem) => void,
  onViewMembers: (space: KbSpaceListItem) => void,
): DataTableColumn<KbSpaceListItem>[] {
  const columns: DataTableColumn<KbSpaceListItem>[] = [
    {
      key: "name",
      header: "Space",
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0">{row.icon ?? "📚"}</span>
          <Link
            href={spaceHref(row.id)}
            className="truncate font-medium text-foreground hover:underline"
          >
            {row.name}
          </Link>
          {row.archivedAt !== null && (
            <Badge
              variant="outline"
              className="text-micro h-4 shrink-0 border-border bg-muted px-1.5 text-muted-foreground"
            >
              Archived
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "audience",
      header: "Audience",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {AUDIENCE_LABELS[row.audience ?? "internal"]}
        </span>
      ),
    },
    {
      key: "pageCount",
      header: "Pages",
      cell: (row) => (
        <span className="tabular-nums text-sm text-muted-foreground">
          {row.pageCount}
        </span>
      ),
    },
    {
      key: "memberCount",
      header: "Members",
      cell: (row) => (
        <span className="tabular-nums text-sm text-muted-foreground">
          {row.memberCount}
        </span>
      ),
    },
    {
      key: "ownerName",
      header: "Owner",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.ownerName ?? "—"}
        </span>
      ),
    },
    {
      key: "updatedAt",
      header: "Updated",
      cell: (row) => (
        <span
          className="tabular-nums text-sm text-muted-foreground"
          suppressHydrationWarning
        >
          {kbTimeAgo(row.updatedAt)}
        </span>
      ),
    },
  ];

  if (!canManage) return columns;

  return [
    ...columns,
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <SpaceRowActions
          space={row}
          onEdit={onEdit}
          onArchiveToggle={onArchiveToggle}
          onViewMembers={onViewMembers}
        />
      ),
    },
  ];
}

export interface SpacesListTableProps {
  spaces: KbSpaceListItem[];
  canManage: boolean;
  pageSize: number;
  hasMore: boolean;
  hasPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onEdit: (space: KbSpaceListItem) => void;
  onArchiveToggle: (space: KbSpaceListItem) => void;
  onViewMembers: (space: KbSpaceListItem) => void;
  emptyState: React.ReactNode;
}

export function SpacesListTable({
  spaces,
  canManage,
  pageSize,
  hasMore,
  hasPrevious,
  onNext,
  onPrevious,
  onEdit,
  onArchiveToggle,
  onViewMembers,
  emptyState,
}: SpacesListTableProps) {
  const columns = buildColumns(
    canManage,
    onEdit,
    onArchiveToggle,
    onViewMembers,
  );

  function renderMobileCard(row: KbSpaceListItem) {
    return (
      <SpaceCard
        space={row}
        canManage={canManage}
        pageCount={row.pageCount}
        onEdit={onEdit}
        onArchiveToggle={onArchiveToggle}
        onViewMembers={onViewMembers}
      />
    );
  }

  function getRowKey(row: KbSpaceListItem) {
    return row.id;
  }

  return (
    <DataTable
      data={spaces}
      columns={columns}
      getRowKey={getRowKey}
      emptyState={emptyState}
      mobileCard={renderMobileCard}
      pagination={{
        mode: "cursor",
        pageSize,
        hasMore,
        hasPrevious,
        onNext,
        onPrevious,
      }}
    />
  );
}
