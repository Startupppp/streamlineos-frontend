"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { SparklesIcon, XIcon } from "@animateicons/react/lucide";
import { cn } from "@/lib/utils";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { useCan } from "@/hooks/api/access";
import type { KnowledgeGap } from "@/features/support/lib/knowledge-gap.types";
import { pageHref } from "@/lib/knowledge-routes";
import { KnowledgeGapStatusBadge } from "./knowledge-gap-status-badge";

interface KnowledgeGapCardProps {
  gap: KnowledgeGap;
  onDraft: (gapId: number) => void;
  onDismiss: (gapId: number, reason?: string) => void;
  isDrafting: boolean;
  isDismissing: boolean;
}

export function KnowledgeGapCard({
  gap,
  onDraft,
  onDismiss,
  isDrafting,
  isDismissing,
}: KnowledgeGapCardProps) {
  const canManage = useCan("support:knowledge-gaps:manage");
  const [isDismissOpen, setIsDismissOpen] = useState(false);
  const [dismissReason, setDismissReason] = useState("");

  const topSearchQueries = (gap.evidence?.searchQueries ?? []).slice(0, 3);
  const canDraft =
    canManage && (gap.status === "OPEN" || gap.status === "DRAFTED");
  const canDismiss = canManage && gap.status === "OPEN";
  const awaitingReview = gap.status === "DRAFTED" || gap.status === "ROUTED";
  const dismissalReason =
    gap.status === "DISMISSED" ? gap.dismissalReason : null;

  function handleDraft() {
    onDraft(gap.id);
  }

  function handleDismissOpen() {
    setIsDismissOpen(true);
  }

  function handleDismissOpenChange(nextOpen: boolean) {
    setIsDismissOpen(nextOpen);
    if (!nextOpen) setDismissReason("");
  }

  function handleReasonChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setDismissReason(event.target.value);
  }

  function handleDismissConfirm() {
    const trimmed = dismissReason.trim();
    onDismiss(gap.id, trimmed === "" ? undefined : trimmed);
    setDismissReason("");
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-foreground text-sm line-clamp-2 flex-1">
          {gap.representativeQuestion}
        </p>
        <KnowledgeGapStatusBadge status={gap.status} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
            "bg-primary/5 text-foreground border-border",
          )}
        >
          {gap.ticketCount} {gap.ticketCount === 1 ? "ticket" : "tickets"}
        </span>
        {gap.deflectionCount > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-status-success-surface text-status-success-ink border-status-success-rule">
            {gap.deflectionCount}{" "}
            {gap.deflectionCount === 1 ? "deflection" : "deflections"}
          </span>
        )}
      </div>

      {topSearchQueries.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            Related searches
          </p>
          <ul className="space-y-0.5">
            {topSearchQueries.map((sq) => (
              <li
                key={sq.query}
                className="flex items-center justify-between gap-1 text-xs text-muted-foreground min-w-0"
              >
                <span className="truncate min-w-0">&ldquo;{sq.query}&rdquo;</span>
                <span className="ml-2 shrink-0 text-muted-foreground">
                  ×{sq.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {awaitingReview && (
        <p className="text-xs text-status-warning-ink font-medium">
          Awaiting human review — Review &amp; publish in KB
        </p>
      )}

      {dismissalReason !== null && (
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-muted-foreground">
            Dismissed because
          </p>
          <p className="text-xs text-foreground">{dismissalReason}</p>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1 border-t border-border flex-wrap">
        {canDraft && (
          <LoadingButton
            size="sm"
            variant="outline"
            isPending={isDrafting}
            loadingText="Drafting…"
            onClick={handleDraft}
            className="h-7 text-xs"
          >
            <SparklesIcon size={12} className="mr-1" />
            Draft KB Article
          </LoadingButton>
        )}
        {gap.proposedArticleId !== null && (
          <Link
            href={pageHref(gap.proposedArticleId)}
            className="inline-flex items-center gap-1 text-xs text-status-info-ink hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            View Draft
          </Link>
        )}
        {canDismiss && (
          <>
            <AnimatedIconButton
              icon={XIcon}
              iconSize={12}
              size="sm"
              variant="ghost"
              aria-label="Dismiss knowledge gap"
              onClick={handleDismissOpen}
              disabled={isDismissing}
              className="h-7 w-7 p-0 ml-auto text-muted-foreground hover:text-destructive"
              title="Dismiss gap"
            />
            <ConfirmDialog
              open={isDismissOpen}
              onOpenChange={handleDismissOpenChange}
              destructive
              isPending={isDismissing}
              title="Dismiss this knowledge gap?"
              description="It stops appearing as work to do. Say why so the next person reviewing this list knows it was a decision."
              confirmLabel="Dismiss gap"
              onConfirm={handleDismissConfirm}
              content={
                <div className="space-y-1.5">
                  <Label htmlFor={`dismiss-reason-${gap.id}`}>
                    Reason (optional)
                  </Label>
                  <Textarea
                    id={`dismiss-reason-${gap.id}`}
                    value={dismissReason}
                    onChange={handleReasonChange}
                    maxLength={1000}
                    rows={3}
                    placeholder="Already covered by the refund policy article"
                  />
                </div>
              }
            />
          </>
        )}
      </div>
    </div>
  );
}
