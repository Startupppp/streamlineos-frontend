"use client";

import { useCallback } from "react";
import type { DataTableColumn } from "@/components/ui/data-table.types";
import type { KbPageCollectionItem } from "@/hooks/api/kb/page-collection";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import { TrustBadge, StatusBadge, OwnerMissingBadge } from "./kb-collection-badges";
import { CollectionItemMenu } from "./wiki-page-collection-item-menu";
import { KbTable2Icon } from "@/features/wiki/lib/kb-icons";

interface CollectionRowMenuProps {
  page: KbPageCollectionItem;
  resolveHref: (id: number) => string;
  contextRowId: number | null;
  onContextRowChange: (id: number | null) => void;
}

function CollectionRowMenu({
  page,
  resolveHref,
  contextRowId,
  onContextRowChange,
}: CollectionRowMenuProps) {
  const handleOpenChange = useCallback(
    (open: boolean) => onContextRowChange(open ? page.id : null),
    [onContextRowChange, page.id],
  );
  return (
    <CollectionItemMenu
      page={page}
      resolveHref={resolveHref}
      open={contextRowId === page.id}
      onOpenChange={handleOpenChange}
    />
  );
}

export function buildColumns(
  resolveHref: (id: number) => string,
  ownerNames: Map<string, string>,
  contextRowId: number | null,
  onContextRowChange: (id: number | null) => void,
): DataTableColumn<KbPageCollectionItem>[] {
  return [
    {
      key: "title",
      header: "Title",
      cell: (row) => (
        <div className="flex items-center gap-1.5 min-w-0">
          <a
            href={resolveHref(row.id)}
            className="font-medium text-foreground hover:underline truncate"
          >
            {row.title || "Untitled"}
          </a>
          {row.kind === "spreadsheet" && (
            <span role="img" aria-label="Spreadsheet">
              <KbTable2Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "trustState",
      header: "Trust",
      cell: (row) => (
        <div className="flex flex-wrap items-center gap-1">
          <TrustBadge trustState={row.trustState} />
          {row.ownerUserId ? (
            <OwnerMissingBadge ownerMembershipId={row.ownerMembershipId} />
          ) : null}
        </div>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      cell: (row) => {
        if (!row.ownerUserId) return <OwnerMissingBadge ownerMembershipId={null} />;
        const name = ownerNames.get(row.ownerUserId);
        return <span className="text-sm text-foreground">{name ?? "—"}</span>;
      },
    },
    {
      key: "updatedAt",
      header: "Updated",
      cell: (row) => (
        <span className="tabular-nums text-muted-foreground text-sm">
          {kbTimeAgo(row.updatedAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <CollectionRowMenu
          page={row}
          resolveHref={resolveHref}
          contextRowId={contextRowId}
          onContextRowChange={onContextRowChange}
        />
      ),
    },
  ];
}
