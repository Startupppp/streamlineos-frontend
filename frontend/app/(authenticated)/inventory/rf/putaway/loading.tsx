import { Skeleton } from "@/components/ui/skeleton";

/**
 * The same five task-row blocks the putaway queue shows while `useRfQueue` is in
 * flight, so the segment fallback and the in-component one are one picture. No
 * `PageWrapper`: this is a 375px handheld surface and the desktop page shell has
 * no business appearing on it, even for a moment.
 */
export default function RfPutawayQueueLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
      <Skeleton className="h-10 w-40" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  );
}
