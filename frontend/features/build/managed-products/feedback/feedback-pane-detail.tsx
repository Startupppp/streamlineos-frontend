"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatShortDate } from "@/lib/date-utils";
import { formatSubmissionAge } from "@/features/build/feedbucket/feedbucket-constants";
import type { FeedbucketSubmission } from "@/types/feedbucket";
import { useProductOpportunitiesSearch } from "./use-submission-opportunities";
import {
  ChannelBadge,
  ConsentBadge,
  FrequencyBadge,
  SegmentBadge,
  SentimentBadge,
  ThemeBadge,
} from "./feedback-signal-badges";

interface FactRowProps {
  label: string;
  children: React.ReactNode;
}

function FactRow({ label, children }: FactRowProps) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <dt className="w-28 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-pretty text-foreground">
        {children}
      </dd>
    </div>
  );
}

interface FeedbackPaneDetailProps {
  submission: FeedbucketSubmission;
  managedProductId: number;
  unmarkPending: boolean;
  onClassify: () => void;
  onDuplicate: () => void;
  onUnmark: () => void;
  onLinkOpp: () => void;
  onOpenDetail?: () => void;
  onOpenTicket?: (ticketId: number, projectId: number) => void;
}

export function FeedbackPaneDetail({
  submission,
  managedProductId,
  unmarkPending,
  onClassify,
  onDuplicate,
  onUnmark,
  onLinkOpp,
  onOpenDetail,
  onOpenTicket,
}: FeedbackPaneDetailProps) {
  const consentDenied = submission.consentStatus === "denied";
  const reporter = consentDenied
    ? null
    : (submission.reporterName ?? submission.reporterEmail);
  const ticketTitle =
    submission.linkedTicket?.title ?? submission.linkedTicketKey;
  const opportunityIds = submission.opportunityIds ?? [];
  const { data: opportunitySearch } = useProductOpportunitiesSearch(
    managedProductId,
    "",
    opportunityIds.length > 0,
  );
  const opportunityTitles = useMemo(() => {
    const titles = new Map<number, string>();
    for (const item of opportunitySearch?.data ?? []) {
      titles.set(item.id, item.title);
    }
    return titles;
  }, [opportunitySearch?.data]);

  const handleOpenLinkedTicket = useCallback(() => {
    if (onOpenTicket && submission.linkedTicket) {
      onOpenTicket(submission.linkedTicket.id, submission.linkedTicket.projectId);
    }
  }, [onOpenTicket, submission.linkedTicket]);

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">
        <p className="text-pretty text-sm leading-relaxed text-foreground whitespace-pre-wrap">
          {submission.message}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          <ChannelBadge channel={submission.sourceChannel} />
          <SentimentBadge sentiment={submission.sentiment} />
          <FrequencyBadge duplicateCount={submission.duplicateCount} />
        </div>

        <dl className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
          <FactRow label="Heard">
            {formatSubmissionAge(submission.createdAt)}
          </FactRow>
          {submission.pageUrl ? (
            <FactRow label="Page">{submission.pageUrl}</FactRow>
          ) : null}
          {reporter ? <FactRow label="From">{reporter}</FactRow> : null}
          {submission.assignee ? (
            <FactRow label="Owner">{submission.assignee.name}</FactRow>
          ) : null}
          <FactRow label="Consent">
            <ConsentBadge status={submission.consentStatus} />
          </FactRow>
          {submission.consentRecordedAt ? (
            <FactRow label="Recorded">
              {formatShortDate(submission.consentRecordedAt)}
            </FactRow>
          ) : null}
          {submission.accountValueSnapshot ? (
            <FactRow label="Account value">{submission.accountValueSnapshot}</FactRow>
          ) : null}
          {ticketTitle ? (
            <FactRow label="Ticket">
              {submission.linkedTicket?.projectId && submission.linkedTicket?.id && onOpenTicket ? (
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-sm font-normal text-primary hover:underline"
                  onClick={handleOpenLinkedTicket}
                >
                  {ticketTitle}
                </Button>
              ) : submission.linkedTicket?.projectId && submission.linkedTicketKey ? (
                <Link
                  href={`/build/${submission.linkedTicket.projectId}/tickets/${submission.linkedTicketKey}`}
                  className="text-primary hover:underline"
                >
                  {ticketTitle}
                </Link>
              ) : (
                ticketTitle
              )}
            </FactRow>
          ) : null}
        </dl>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground">Classification</p>
          <div className="flex flex-wrap gap-1.5">
            <ThemeBadge theme={submission.theme} />
            <SegmentBadge segment={submission.segment} />
            {!submission.theme &&
            !submission.segment &&
            !submission.sentiment ? (
              <p className="text-sm text-muted-foreground">
                Not classified yet.
              </p>
            ) : null}
          </div>
          {submission.aiType && submission.aiModel ? (
            <p className="text-xs text-muted-foreground" data-testid="ai-suggestion-label">
              AI suggestion · model: {submission.aiModel}
              {typeof submission.aiConfidence === "number"
                ? ` · confidence: ${Math.round(submission.aiConfidence * 100)}%`
                : ""}
            </p>
          ) : null}
          {submission.allowedActions.includes("classify") ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={onClassify}
            >
              Edit classification
            </Button>
          ) : null}
        </div>

        {submission.duplicateOfId || submission.duplicateCount > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">Duplicates</p>
            {submission.duplicateOfId ? (
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>Marked as a duplicate of another submission.</span>
                {submission.allowedActions.includes("unmarkDuplicate") ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={unmarkPending}
                    onClick={onUnmark}
                  >
                    Unmark
                  </Button>
                ) : null}
              </div>
            ) : null}
            {submission.duplicateCount > 0 ? (
              <p className="text-sm text-muted-foreground">
                {submission.duplicateCount === 1
                  ? "1 other submission points here"
                  : `${submission.duplicateCount} other submissions point here`}
              </p>
            ) : null}
          </div>
        ) : null}

        {opportunityIds.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">
              Linked opportunities
            </p>
            <ul className="flex flex-col gap-1">
              {opportunityIds.map((opportunityId) => (
                <li key={opportunityId}>
                  <Link
                    href={`/build/managed-products/${managedProductId}/insights?view=discovery&opportunity=${opportunityId}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {opportunityTitles.get(opportunityId) ??
                      "Linked opportunity"}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap gap-2 border-t border-border px-6 py-4">
        {submission.allowedActions.includes("markDuplicate") ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDuplicate}
          >
            Mark duplicate
          </Button>
        ) : null}
        {submission.allowedActions.includes("linkOpportunity") ? (
          <Button type="button" variant="outline" size="sm" onClick={onLinkOpp}>
            Link to opportunity
          </Button>
        ) : null}
        {onOpenDetail ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenDetail}
          >
            Open full details
          </Button>
        ) : null}
      </div>
    </>
  );
}
