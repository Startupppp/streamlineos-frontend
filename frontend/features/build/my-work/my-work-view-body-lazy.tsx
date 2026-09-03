"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * My Issues opens on the assigned tab in the list view, which renders the due
 * buckets — `MyWorkViewBody` is what the board, the table and the non-assigned
 * tabs need, and nothing else. Statically imported it put @hello-pangea/dnd,
 * @tanstack/react-table and react-day-picker in the route's first load for a
 * subtree the default view never mounts.
 */

function MyWorkViewFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading your issues"
      className="flex min-h-0 flex-1 flex-col gap-2 p-1"
    >
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-5/6" />
      <Skeleton className="h-10 w-4/6" />
    </div>
  );
}

export const MyWorkViewBody = dynamic(
  () => import("./my-work-view-body").then((m) => ({ default: m.MyWorkViewBody })),
  { ssr: false, loading: () => <MyWorkViewFallback /> },
);
