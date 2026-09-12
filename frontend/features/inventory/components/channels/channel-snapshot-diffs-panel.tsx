"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AppSheet, ErrorState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { ConfirmWithReasonSheet } from "@/components/ui/confirm-with-reason-sheet";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatDateTime } from "@/lib/date-utils";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import {
  useAcceptSnapshotDiff,
  useChannelSnapshotDiffs,
  useDismissSnapshotDiff,
  type Channel,
  type ChannelSnapshotDiff,
  type SnapshotDiffStatus,
} from "@/hooks/api/inventory/channels";

const ALL = "__all__";

type PendingResolution = { diff: ChannelSnapshotDiff; action: "accept" | "dismiss" } | null;

function isSnapshotDiffStatus(value: string): value is SnapshotDiffStatus {
  return value === "OPEN" || value === "ACCEPTED" || value === "DISMISSED";
}

/**
 * What the marketplace thinks it holds, against what the ledger says.
 *
 * The nightly sweep writes these rows and nothing in the product read them, so
 * an oversold listing or a sync that had silently stopped produced a difference
 * that sat unseen. Accepting posts a stock movement and is therefore gated on
 * `inventory:stock:adjust`, not on the channel key — and the channel's own
 * policy can forbid it, which the panel says rather than offering a button that
 * answers 409.
 */
export function ChannelSnapshotDiffsPanel({
  open,
  onOpenChange,
  channel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: Channel | null;
}) {
  const canAdjust = useCan("inventory:stock:adjust");
  const [status, setStatus] = useState<SnapshotDiffStatus | undefined>("OPEN");
  const [pending, setPending] = useState<PendingResolution>(null);

  const { data, isLoading, isError, error, refetch } = useChannelSnapshotDiffs(
    open && channel ? channel.id : null,
    { status, limit: 50 },
  );
  const accept = useAcceptSnapshotDiff();
  const dismiss = useDismissSnapshotDiff();

  const adjustmentAllowed = data?.snapshotPolicy === "ALLOW_ADJUSTMENT";

  function handleStatusChange(next: string): void {
    setStatus(isSnapshotDiffStatus(next) ? next : undefined);
  }

  function handleResolve(note: string): void {
    if (pending === null || channel === null) return;
    const mutation = pending.action === "accept" ? accept : dismiss;
    mutation.mutate(
      { channelId: channel.id, diffId: pending.diff.id, note },
      {
        onSuccess: () => {
          toast.success(
            pending.action === "accept"
              ? "Accepted — a stock movement was posted to close the difference."
              : "Dismissed. Nothing was posted.",
          );
          setPending(null);
        },
        onError: (resolveError) => toast.error(getErrorMessage(resolveError)),
      },
    );
  }

  const columns: DataTableColumn<ChannelSnapshotDiff>[] = [
    {
      key: "externalSku",
      header: "Listing",
      cell: (row) => (
        <span className="text-sm font-medium">{row.externalSku ?? "Unmapped listing"}</span>
      ),
    },
    {
      key: "channelQty",
      header: "Channel says",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums",
      cell: (row) => row.channelQty,
    },
    {
      key: "internalQty",
      header: "Ledger says",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums",
      cell: (row) => row.internalQty,
    },
    {
      key: "difference",
      header: "Difference",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums font-semibold",
      cell: (row) => row.difference,
    },
    {
      key: "snapshotAt",
      header: "Seen",
      cell: (row) => (
        <span className="text-dense text-muted-foreground">{formatDateTime(row.snapshotAt)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <span
          className={cn(
            "inline-flex items-center rounded-md border px-2 py-0.5 text-dense font-medium",
            statusToneClasses(
              row.status === "ACCEPTED" ? "success" : row.status === "DISMISSED" ? "neutral" : "warning",
            ),
          )}
        >
          {row.status === "OPEN" ? "Needs a decision" : row.status === "ACCEPTED" ? "Accepted" : "Dismissed"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-44",
      className: "w-44",
      cell: (row) =>
        row.status !== "OPEN" ? null : (
          <div className="flex gap-1">
            {canAdjust && adjustmentAllowed ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7"
                onClick={() => setPending({ diff: row, action: "accept" })}
              >
                Accept
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              className="h-7"
              onClick={() => setPending({ diff: row, action: "dismiss" })}
            >
              Dismiss
            </Button>
          </div>
        ),
    },
  ];

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={onOpenChange}
        title={`${channel?.name ?? "Channel"} — stock differences`}
        description="What this channel reported holding, against what the ledger says. Accepting posts a movement; dismissing records that the difference was judged unimportant."
        className="sm:max-w-3xl"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Select value={status ?? ALL} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-52" aria-label="Filter by difference status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">Needs a decision</SelectItem>
                <SelectItem value="ACCEPTED">Accepted</SelectItem>
                <SelectItem value="DISMISSED">Dismissed</SelectItem>
                <SelectItem value={ALL}>All differences</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {data && !adjustmentAllowed ? (
            <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-dense text-muted-foreground">
              This channel&rsquo;s snapshot policy is {data.snapshotPolicy}, so a difference here
              cannot be accepted into the ledger. It can still be dismissed with a reason.
            </p>
          ) : null}

          {isError ? (
            <ErrorState
              title="Couldn't load the differences"
              description={getErrorMessage(error)}
              onRetry={() => void refetch()}
            />
          ) : (
            <DataTable
              data={data?.items ?? []}
              columns={columns}
              getRowKey={(row) => row.id}
              isLoading={isLoading}
              minWidth="880px"
              emptyState={
                status === "OPEN" ? (
                  <InventoryEmptyState
                    illustrationPreset="default"
                    title="Nothing to decide"
                    description="Every listing this channel reported matches the ledger, so the sweep found no difference to raise."
                    compact
                  />
                ) : (
                  <InventoryEmptyState
                    illustrationPreset="default"
                    title="No differences with that status"
                    description="Change the filter to see the rest."
                    compact
                  />
                )
              }
            />
          )}
        </div>
      </AppSheet>

      <ConfirmWithReasonSheet
        open={pending !== null}
        onOpenChange={(next) => {
          if (!next) setPending(null);
        }}
        title={
          pending?.action === "accept"
            ? "Accept this difference into the ledger"
            : "Dismiss this difference"
        }
        description={
          pending?.action === "accept"
            ? "This posts a stock movement whose only justification is that the channel disagreed with us. Say why in a sentence — it becomes the record of the decision."
            : "Nothing is posted. Say why the difference was judged unimportant."
        }
        reasonLabel="Reason"
        reasonPlaceholder="Cycle count confirmed the channel figure"
        reasonRequired
        confirmLabel={pending?.action === "accept" ? "Accept and post" : "Dismiss"}
        isPending={accept.isPending || dismiss.isPending}
        onConfirm={handleResolve}
      />
    </>
  );
}
