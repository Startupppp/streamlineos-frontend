"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useSignEnvelopeAudit } from "@/hooks/api/sign/envelopes";
import { useOrgTimeZone } from "@/hooks/api/org-display";
import { formatDateTimeInOrgTz, resolveOrgTimeZone } from "@/lib/date-utils";

function formatEventType(eventType: string): string {
  return eventType.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

export function AuditTrailSheet({ envelopeId, open, onOpenChange }: { envelopeId: number; open: boolean; onOpenChange: (open: boolean) => void }) {
  const audit = useSignEnvelopeAudit(open ? envelopeId : undefined);
  const events = audit.data;
  const sheetState = usePageState({
    permission: "sign:audit:view",
    isLoading: open && audit.isLoading,
    isError: audit.isError,
    error: audit.error,
    isEmpty: open && !audit.isLoading && !audit.isError && (events?.length ?? 0) === 0,
  });
  const orgTimeZone = useOrgTimeZone();
  const zone = resolveOrgTimeZone(orgTimeZone);

  function handleRetry() {
    void audit.refetch();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Audit trail</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 px-4">
          <PageState
            resolution={sheetState}
            loading={
              <div className="space-y-3 py-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            }
            onRetry={handleRetry}
            compact
            empty={
              <EmptyState
                title="No events yet"
                description="Envelope events show up here as people sign, send, or decline."
                compact
                className="border-0 bg-transparent"
              />
            }
          >
            <ul className="space-y-3 py-4">
              {events?.map((event) => (
                <li key={event.id} className="border-b border-border pb-3 last:border-0">
                  <p className="text-sm font-medium">{formatEventType(event.eventType)}</p>
                  <p className="text-sm text-muted-foreground">
                    {event.actorName ?? "System"} {event.actorEmail ? `(${event.actorEmail})` : ""} · {formatDateTimeInOrgTz(event.createdAt, orgTimeZone)} ({zone})
                  </p>
                  {event.ipAddress ? <p className="text-sm text-muted-foreground">IP: {event.ipAddress}</p> : null}
                </li>
              ))}
            </ul>
          </PageState>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
