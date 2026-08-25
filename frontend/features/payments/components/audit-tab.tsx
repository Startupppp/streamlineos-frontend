"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { usePaymentAudit } from "@/hooks/api/payments";

export function AuditTab({ providerKey }: { providerKey: string }) {
  const { data: events, isLoading } = usePaymentAudit(providerKey);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return <EmptyState title="No audit events yet" description="Provider changes will be logged here." compact />;
  }

  return (
    <ul className="space-y-1.5">
      {events.map((event) => (
        <li key={event.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
          <div>
            <p className="text-xs font-medium text-foreground">{event.action.replace(/_/g, " ").replace(/\./g, " · ")}</p>
            {event.environment && <p className="text-dense text-muted-foreground">{event.environment} environment</p>}
          </div>
          <span className="text-dense text-muted-foreground shrink-0">
            {new Date(event.createdAt).toLocaleString()}
          </span>
        </li>
      ))}
    </ul>
  );
}
