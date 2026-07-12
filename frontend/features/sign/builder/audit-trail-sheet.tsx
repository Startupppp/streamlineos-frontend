"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useSignEnvelopeAudit } from "@/hooks/api/sign/envelopes";

function formatEventType(eventType: string): string {
  return eventType.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

export function AuditTrailSheet({ envelopeId, open, onOpenChange }: { envelopeId: number; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: events, isLoading } = useSignEnvelopeAudit(open ? envelopeId : undefined);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Audit trail</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 px-4">
          {isLoading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !events || events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No events yet.</p>
          ) : (
            <ul className="space-y-3 py-4">
              {events.map((event) => (
                <li key={event.id} className="border-b border-border/60 pb-3 last:border-0">
                  <p className="text-sm font-medium">{formatEventType(event.eventType)}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.actorName ?? "System"} {event.actorEmail ? `(${event.actorEmail})` : ""} · {new Date(event.createdAt).toLocaleString()}
                  </p>
                  {event.ipAddress && <p className="text-xs text-muted-foreground/70">IP: {event.ipAddress}</p>}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
