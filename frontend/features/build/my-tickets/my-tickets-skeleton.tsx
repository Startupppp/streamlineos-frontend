"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { KanbanBoardSkeleton } from "@/components/ui/kanban-skeleton";
import type { MyTicketsView } from "./my-tickets-view";

export function MyTicketsSkeleton({ view }: { view: MyTicketsView }) {
  if (view === "board") {
    return <KanbanBoardSkeleton />;
  }
  if (view === "list") {
    return (
      <div className="space-y-1.5 py-2">
        <Skeleton className="h-9 w-full rounded-lg" />
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    );
  }
  return (
    <div className="py-2">
      <DataTableSkeleton rows={12} columns={6} />
    </div>
  );
}
