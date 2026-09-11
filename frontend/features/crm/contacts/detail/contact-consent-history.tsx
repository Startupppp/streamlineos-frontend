"use client";

import { useCallback } from "react";
import { ArrowRight } from "lucide-react";
import { AppSheet } from "@/components/shared/app-sheet";
import { ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { renderFieldValue, resolveField } from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { CONTACT_CONSENT_LAYOUT } from "@/lib/renderer/crm/contact-consent-layout";
import { useContactConsentEvents, type ContactConsentEvent } from "@/hooks/api/crm";
import { formatRelativeTime } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";

/**
 * Who made this change, in words.
 *
 * The trail stores an actor id and nothing else, and a screen may never render a
 * raw id, so the backend joins the name. Four cases, and collapsing them would
 * lose the distinction an audit is actually reading for: a colleague, a
 * colleague whose user record is gone, the contact acting on their own behalf,
 * and no actor at all. "System" for all of the last three would say that the
 * product opted somebody out when in fact they opted themselves out.
 */
export function describeConsentActor(
  event: Pick<ContactConsentEvent, "recordedByName" | "recordedByUserId" | "source">,
): string {
  if (event.recordedByName) return event.recordedByName;
  if (event.recordedByUserId) return "A colleague no longer in this workspace";
  if (event.source === "UNSUBSCRIBE_LINK") return "The contact, via the unsubscribe link";
  if (event.source === "WEB_FORM") return "The contact, via a web form";
  return "No person recorded";
}

interface ContactConsentHistoryProps {
  contactId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Every change to this contact's consent, newest first.
 *
 * The card beside this shows the current position — at most one row per channel,
 * because the unique index allows one and the write upserts. That cannot answer
 * "when did they opt out", which is the whole question under DPDP. The trail
 * that can was being written on every change and read by nothing.
 *
 * Ordering is the server's, not this component's: `created_at DESC, id DESC`, so
 * two changes landing in the same millisecond keep a fixed order between
 * requests. Re-sorting here would only be able to reproduce the ambiguity.
 */
export function ContactConsentHistory({
  contactId,
  open,
  onOpenChange,
}: ContactConsentHistoryProps) {
  const layout = useTenantLayout(CONTACT_CONSENT_LAYOUT);
  const { data: events, isLoading, isError, error, refetch } = useContactConsentEvents(
    contactId,
    open,
  );

  const channelField = resolveField(layout, "channel");
  const statusField = resolveField(layout, "status");
  const sourceField = resolveField(layout, "source");
  const basisField = resolveField(layout, "legalBasis");

  const handleRetry = useCallback(() => void refetch(), [refetch]);

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Consent history"
      description="Every change, in the order it happened. Nothing here can be edited."
    >
      {isLoading ? (
        <div className="flex flex-col gap-gap-toolbar">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      ) : isError ? (
        <ErrorState
          title="Couldn't load the history"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      ) : (events?.length ?? 0) === 0 ? (
        <EmptyState
          className="border-0 bg-transparent"
          title="Nothing recorded yet"
          /*
            Deliberately not "no history". An empty trail means no consent
            decision has ever been taken for this person, which is a different
            statement from a history that failed to load and a different one
            again from a contact who opted out.
          */
          description="No consent decision has been taken for this contact on any channel."
        />
      ) : (
        <ol className="flex flex-col gap-gap-toolbar">
          {events?.map((event) => (
            <li
              key={event.id}
              className="flex flex-col gap-gap-field rounded-lg border border-border/70 p-3"
            >
              <div className="flex flex-wrap items-center gap-gap-inline">
                {renderFieldValue(channelField, event.channel)}
                {/*
                  The transition, not just the outcome. "Opted out → Opted in" is
                  the sentence a reviewer needs; "Opted in" alone hides whether
                  anything changed.
                */}
                {event.fromStatus ? (
                  <>
                    {renderFieldValue(statusField, event.fromStatus)}
                    <ArrowRight className="h-3 w-3 text-muted-foreground" aria-label="became" />
                  </>
                ) : null}
                {renderFieldValue(statusField, event.toStatus)}
              </div>

              <div className="flex flex-wrap items-center gap-gap-inline">
                {renderFieldValue(sourceField, event.source)}
                {event.legalBasis ? renderFieldValue(basisField, event.legalBasis) : null}
              </div>

              {event.sourceDetail ? (
                <p className="text-xs text-muted-foreground">{event.sourceDetail}</p>
              ) : null}

              <p className="text-xs text-muted-foreground">
                {describeConsentActor(event)}
                {" · "}
                {/*
                  Relative for reading, exact on hover. An audit has to be able
                  to answer "when precisely", and "3 months ago" cannot.
                */}
                <time dateTime={event.createdAt} title={new Date(event.createdAt).toISOString()}>
                  {formatRelativeTime(event.createdAt)}
                </time>
              </p>
            </li>
          ))}
        </ol>
      )}
    </AppSheet>
  );
}
