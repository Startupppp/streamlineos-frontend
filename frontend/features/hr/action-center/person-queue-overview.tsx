"use client";

import type { ActionCenterItem } from "@/features/hr/action-center/queue-item";

export function PersonQueueOverview({
  items,
}: {
  items: readonly ActionCenterItem[];
}) {
  if (items.length === 0)
    return (
      <p className="text-dense text-muted-foreground">
        Nothing from this person is waiting in the queues you can see.
      </p>
    );

  return (
    <div className="space-y-2">
      <p className="text-label font-semibold">Waiting on you</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center gap-x-2 text-dense text-muted-foreground"
          >
            <span className="text-foreground">{item.type}</span>
            <span className="tabular-nums">{item.dateRange}</span>
            {item.deadlineAffected ? <span>Affects cutoff</span> : null}
          </li>
        ))}
      </ul>
      <p className="text-dense text-muted-foreground">
        Pay is not shown on this surface.
      </p>
    </div>
  );
}
