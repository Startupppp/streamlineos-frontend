"use client";

import { useSupportStats } from "@/lib/api/hooks/support";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function TicketStats() {
  const { data: stats, isLoading } = useSupportStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-14" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const items = [
    { label: "Open", value: stats.open ?? 0 },
    { label: "In Progress", value: stats.in_progress ?? 0 },
    { label: "Resolved", value: stats.resolved ?? 0 },
    { label: "SLA Breached", value: stats.sla_breached ?? 0 },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="text-2xl font-bold tabular-nums mt-1">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
