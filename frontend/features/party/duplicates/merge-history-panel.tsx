"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { TablePagination } from "@/components/ui/table-pagination";
import { TruncatedText } from "@/components/ui/truncated-text";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import { formatShortDate } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePartyMerges, useRevertPartyMerge } from "@/hooks/api/party/merges";
import type { PartyMergeRecord } from "@/types/party/merges";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

/**
 * What has been merged, and the offer to take it back.
 *
 * This panel is the reason `GET /party/merges` exists. `party_merges` has always
 * held everything a revert needs, but nothing read it — so the only moment a
 * merge could be undone was the moment it happened, from whatever the caller
 * still had in hand. An action that is reversible for as long as a toast is
 * visible is not one a user can rely on, and the merges the system performs
 * unattended had no toast at all.
 *
 * Reverted rows are shown too, greyed and without the control: "this was undone"
 * is the answer to the question that brings someone here, and hiding it would
 * make them look for a merge that is no longer in the list and merge again.
 */
export function MergeHistoryPanel() {
  const [page, setPage] = useState(1);
  const [revertTarget, setRevertTarget] = useState<PartyMergeRecord | null>(null);

  const merges = usePartyMerges({ page, limit: PAGE_SIZE, includeReverted: true });
  const revertMerge = useRevertPartyMerge();

  const handleRevertOpenChange = useCallback((open: boolean) => {
    if (!open) setRevertTarget(null);
  }, []);

  const handleConfirmRevert = useCallback(() => {
    if (!revertTarget) return;
    revertMerge.mutate(revertTarget.partyMergeId, {
      onSuccess: () => {
        toast.success(`Restored ${revertTarget.mergedName}`);
        setRevertTarget(null);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [revertMerge, revertTarget]);

  const rows = merges.data?.data ?? [];
  const total = merges.data?.pagination.total ?? 0;

  return (
    <section className={cn(CONTENT_PANEL_SOLID, "flex flex-col gap-3 p-4")}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold">Merge history</h2>
        <p className="text-dense text-muted-foreground">
          Undo a merge here at any time
        </p>
      </div>

      {merges.isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : merges.isError ? (
        <ErrorState
          compact
          title="Couldn't load merge history"
          description={getErrorMessage(merges.error)}
          onRetry={merges.refetch}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          compact
          access={merges.access}
          title="Nothing merged yet"
          description="Merges you confirm, and any the system performs on its own, are listed here so they can be undone."
        />
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {rows.map((record) => (
              <li
                key={record.partyMergeId}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-border/70 px-3 py-2",
                  record.revertedAt ? "opacity-60" : null,
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-baseline gap-1.5 text-xs">
                    <TruncatedText
                      text={record.mergedName || "A deleted record"}
                      className="min-w-0 text-xs text-muted-foreground line-through"
                    />
                    <span className="shrink-0 text-muted-foreground">into</span>
                    <TruncatedText
                      text={record.survivorName}
                      className="min-w-0 text-xs font-medium"
                    />
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 text-dense text-muted-foreground">
                    <span className="tabular-nums">{formatShortDate(record.mergedAt)}</span>
                    {record.decidedBy === "SYSTEM" ? (
                      <Badge
                        variant="outline"
                        className="h-4 px-1.5 py-0 text-micro"
                        title="Merged automatically, without being asked"
                      >
                        Automatic
                      </Badge>
                    ) : null}
                    {record.conflictFields.length > 0 ? (
                      <span>
                        {record.conflictFields.length} field
                        {record.conflictFields.length > 1 ? "s" : ""} overwritten
                      </span>
                    ) : null}
                  </p>
                </div>

                {record.revertedAt ? (
                  <Badge
                    variant="outline"
                    className="h-5 shrink-0 px-2 py-0.5 text-micro text-muted-foreground"
                  >
                    Undone
                  </Badge>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setRevertTarget(record)}
                  >
                    <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                    Undo
                  </Button>
                )}
              </li>
            ))}
          </ul>

          {total > PAGE_SIZE ? (
            <TablePagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={setPage}
              className="px-1"
            />
          ) : null}
        </>
      )}

      {revertTarget ? (
        <ConfirmDialog
          open
          onOpenChange={handleRevertOpenChange}
          destructive
          keepOpenOnConfirm
          isPending={revertMerge.isPending}
          icon={<Undo2 className="h-5 w-5 text-destructive" />}
          title="Undo this merge?"
          description={`${revertTarget.mergedName} will be restored as a separate record, and everything the merge moved — contacts, roles, matched email and phone — goes back to it. ${revertTarget.survivorName} returns to the details it had before.`}
          confirmLabel="Undo merge"
          onConfirm={handleConfirmRevert}
        />
      ) : null}
    </section>
  );
}
