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
