"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { GitMerge, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { TablePagination } from "@/components/ui/table-pagination";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import { useCan, useCanState } from "@/hooks/api/access";
import {
  useDismissPartyDuplicate,
  usePartyDuplicates,
} from "@/hooks/api/party/merges";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import type { PartyDuplicateCandidate } from "@/types/party/merges";
import { DuplicatePartyCard } from "./duplicate-pair-card";
import { MergeHistoryPanel } from "./merge-history-panel";
import { PartyMergeDialog } from "./party-merge-dialog";

const PAGE_SIZE = 10;

/** What the detector agreed on, in words rather than as a column name. */
const SIGNAL_LABELS: Record<string, string> = {
  email: "Same email",
  phone: "Same phone",
  whatsapp: "Same WhatsApp number",
  name: "Same name",
  legalName: "Same legal name",
  taxNumber: "Same tax number",
  website: "Same website",
};

function signalLabel(signal: string): string {
  return SIGNAL_LABELS[signal] ?? signal;
}

function CandidateRow({
  candidate,
  canMerge,
  onMerge,
  onDismiss,
}: {
  candidate: PartyDuplicateCandidate;
  canMerge: boolean;
  onMerge: (candidate: PartyDuplicateCandidate) => void;
  onDismiss: (candidate: PartyDuplicateCandidate) => void;
}) {
  const [survivorPartyId, setSurvivorPartyId] = useState(candidate.left.partyId);

  const handleMerge = useCallback(() => onMerge(candidate), [candidate, onMerge]);
  const handleDismiss = useCallback(() => onDismiss(candidate), [candidate, onDismiss]);

  return (
    <li className={cn(CONTENT_PANEL_SOLID, "flex flex-col gap-3 p-4")}>
      <div className="flex flex-wrap items-center gap-2">
        {candidate.signals.map((signal) => (
          <Badge key={signal} variant="outline" className="h-5 px-2 py-0.5 text-[10px]">
            {signalLabel(signal)}
          </Badge>
        ))}
        {candidate.blockers.map((blocker) => (
          <Badge
            key={blocker}
            variant="outline"
            className="h-5 border-status-warning-rule bg-status-warning-surface px-2 py-0.5 text-[10px] text-status-warning-ink"
            title="A reason these may not be the same record"
          >
            {signalLabel(blocker)} differs
          </Badge>
        ))}
        <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">
          {Math.round(candidate.score * 100)}% match
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DuplicatePartyCard
          side={candidate.left}
          isSurvivor={survivorPartyId === candidate.left.partyId}
          onSelect={setSurvivorPartyId}
        />
        <DuplicatePartyCard
          side={candidate.right}
          isSurvivor={survivorPartyId === candidate.right.partyId}
          onSelect={setSurvivorPartyId}
        />
      </div>

      {canMerge ? (
        <div className="flex items-center justify-end gap-2">
          {/*
            Dismiss is the cheap, reversible half and sits as the secondary
            control; merge is the one that destroys a record. Both are offered
            because a queue with only one answer trains people to take it.
          */}
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            <X className="mr-1.5 h-3.5 w-3.5" />
            Not duplicates
          </Button>
          <Button size="sm" onClick={handleMerge}>
            <GitMerge className="mr-1.5 h-3.5 w-3.5" />
            Review &amp; merge
          </Button>
        </div>
      ) : null}
    </li>
  );
}

/**
 * The records the system thinks are the same customer, and what was done about
 * them.
 *
 * At the party grain deliberately: contacts, companies, clients and leads are
 * all aliases for one `business_parties` row, so a duplicate is a duplicate
 * regardless of which CRM screen surfaced it, and one queue is the only way a
 * pair does not get reviewed twice under two names.
 */
export function PartyDuplicatesPage() {
  const canMerge = useCan("party:merges:manage");
  const canViewState = useCanState("party:duplicates:view");

  const [page, setPage] = useState(1);
  const [mergeTarget, setMergeTarget] = useState<PartyDuplicateCandidate | null>(null);
  const [dismissTarget, setDismissTarget] = useState<PartyDuplicateCandidate | null>(null);

  const duplicates = usePartyDuplicates({ page, limit: PAGE_SIZE });
  const dismissDuplicate = useDismissPartyDuplicate();

  const handleMergeOpenChange = useCallback((open: boolean) => {
    if (!open) setMergeTarget(null);
  }, []);

  const handleDismissOpenChange = useCallback((open: boolean) => {
    if (!open) setDismissTarget(null);
  }, []);

  const handleConfirmDismiss = useCallback(() => {
    if (!dismissTarget) return;
    dismissDuplicate.mutate(dismissTarget.candidateId, {
      onSuccess: () => {
        toast.success("Marked as separate records");
        setDismissTarget(null);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [dismissDuplicate, dismissTarget]);

  const handleRetry = useCallback(() => {
    void duplicates.refetch();
  }, [duplicates]);

  /*
   * Checked before the loading branch: a query the permission gate never let run
   * reports `isLoading: false` with no rows, which is indistinguishable from an
   * empty queue — so without this the screen tells someone there are no
   * duplicates when the truth is that they may not look.
   */
  if (canViewState === "denied")
    return <NoPermissionState permission="party:duplicates:view" />;

  const rows = duplicates.data?.data ?? [];
  const total = duplicates.data?.pagination.total ?? 0;

  return (
    <PageWrapper
      title="Duplicate records"
      subtitle="Records that may describe the same customer"
      backHref="/parties"
      badge={total > 0 ? `${total} to review` : undefined}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6">
        <div className="flex min-h-0 flex-col gap-3">
          {duplicates.isLoading ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((row) => (
                <Skeleton key={row} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : duplicates.isError ? (
            <ErrorState
              title="Couldn't load duplicate records"
              description={getErrorMessage(duplicates.error)}
              onRetry={handleRetry}
            />
          ) : rows.length === 0 ? (
            <EmptyState
              access={duplicates.access}
              illustrationPreset="companies"
              title="No duplicates to review"
              description="Records the system believes describe the same customer are queued here. Dismissing a pair is remembered, so it will not come back."
              className="min-h-[30vh]"
            />
          ) : (
            <>
              <ul className="flex flex-col gap-3">
                {rows.map((candidate) => (
                  <CandidateRow
                    key={candidate.candidateId}
                    candidate={candidate}
                    canMerge={canMerge}
                    onMerge={setMergeTarget}
                    onDismiss={setDismissTarget}
                  />
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
        </div>

        {canMerge ? <MergeHistoryPanel /> : null}
      </div>

      {mergeTarget ? (
        <PartyMergeDialog
          open
          onOpenChange={handleMergeOpenChange}
          pair={{
            left: mergeTarget.left,
            right: mergeTarget.right,
            signals: mergeTarget.signals,
          }}
        />
      ) : null}

      {dismissTarget ? (
        <ConfirmDialog
          open
          onOpenChange={handleDismissOpenChange}
          keepOpenOnConfirm
          isPending={dismissDuplicate.isPending}
          title="Mark these as separate records?"
          description={`${dismissTarget.left.name} and ${dismissTarget.right.name} will stay as two records, and this pair will not be suggested again.`}
          confirmLabel="Keep both"
          onConfirm={handleConfirmDismiss}
        />
      ) : null}
    </PageWrapper>
  );
}
