"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingButton } from "@/components/ui/loading-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useKbSharingInventoryPage,
  useBulkRevokeKbSharing,
} from "@/hooks/api/kb/sharing";
import type { SharingInventoryQuery } from "@/hooks/api/kb/sharing";
import { useCursorPagination } from "@/hooks/common/use-cursor-pagination";
import type { InventoryPage } from "@/hooks/api/kb/sharing";

type InventoryItem = InventoryPage["data"][number];

const PAGE_SIZE = 50;

const COLUMNS: DataTableColumn<InventoryItem>[] = [
  {
    key: "page",
    header: "Page",
    cell: (row) => row.page.title,
  },
  {
    key: "type",
    header: "Type",
    cell: (row) => (row.type === "guest" ? "Guest" : "Link"),
  },
  {
    key: "recipient",
    header: "Recipient / Created by",
    cell: (row) =>
      row.type === "guest" ? row.recipient.email : "Share link",
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => row.status,
  },
  {
    key: "expires",
    header: "Expires",
    cell: (row) => (row.expiresAt ? row.expiresAt.slice(0, 10) : "—"),
  },
];

interface KbSharingInventoryTableProps {
  query?: SharingInventoryQuery;
}

export function KbSharingInventoryTable({ query = {} }: KbSharingInventoryTableProps) {
  const pagination = useCursorPagination();
  const { data, isLoading } = useKbSharingInventoryPage(query, pagination.cursor);
  const bulkRevoke = useBulkRevokeKbSharing();
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [revokeOpen, setRevokeOpen] = useState(false);

  const items = data?.data ?? [];
  const hasMore = data?.pagination.hasMore ?? false;

  function handleSelectionChange(sel: Set<string | number>) {
    setSelected(sel);
  }

  function handleCardChecked(id: string | number, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleNext() {
    pagination.goNext(data?.pagination.nextCursor);
  }

  function handlePrevious() {
    pagination.goPrevious();
  }

  function handleRevokeOpenChange(open: boolean) {
    setRevokeOpen(open);
  }

  function handleOpenRevoke() {
    setRevokeOpen(true);
  }

  function handleConfirmBulkRevoke() {
    const ids = Array.from(selected);
    const toRevoke = items
      .filter((item) => ids.includes(item.id))
      .map((item) => ({ type: item.type, id: item.id }));
    bulkRevoke.mutate(toRevoke, {
      onSuccess: (result) => {
        toast.success(`${result.revoked} item${result.revoked === 1 ? "" : "s"} revoked`);
        setSelected(new Set());
        setRevokeOpen(false);
        pagination.reset();
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {selected.size > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {selected.size} selected
          </span>
          <ConfirmDialog
            title="Revoke selected items?"
            description={`This will revoke access for ${selected.size} item${selected.size === 1 ? "" : "s"}. This cannot be undone.`}
            confirmLabel="Revoke"
            destructive
            isPending={bulkRevoke.isPending}
            open={revokeOpen}
            onOpenChange={handleRevokeOpenChange}
            onConfirm={handleConfirmBulkRevoke}
          />
          <LoadingButton
            type="button"
            variant="destructive"
            size="sm"
            isPending={bulkRevoke.isPending}
            onClick={handleOpenRevoke}
          >
            Revoke selected
          </LoadingButton>
        </div>
      )}
      <DataTable
        data={items}
        columns={COLUMNS}
        getRowKey={(row) => row.id}
        isLoading={isLoading}
        mobileCard={(row) => (
          <div className="flex min-w-0 items-start gap-3">
            <Checkbox
              checked={selected.has(row.id)}
              onCheckedChange={(checked) => handleCardChecked(row.id, checked === true)}
              aria-label={`Select ${row.page.title}`}
              className="mt-0.5"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{row.page.title}</p>
              <p className="text-xs text-muted-foreground">
                {row.type === "guest" ? "Guest" : "Link"}
                {" · "}
                {row.type === "guest" ? row.recipient.email : "Share link"}
                {" · "}
                {row.status}
                {" · "}
                {row.expiresAt ? row.expiresAt.slice(0, 10) : "No expiry"}
              </p>
            </div>
          </div>
        )}
        selection={{
          selected,
          onChange: handleSelectionChange,
        }}
        pagination={{
          mode: "cursor",
          pageSize: PAGE_SIZE,
          pageNumber: pagination.pageNumber,
          hasMore,
          hasPrevious: pagination.hasPrevious,
          onNext: handleNext,
          onPrevious: handlePrevious,
        }}
      />
    </div>
  );
}
