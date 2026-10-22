import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { EventStreamPageContent } from "@/features/hr/enterprise/ops/event-stream/event-stream-page-content";
import { prefetchHrEventStream } from "@/lib/prefetch/hr-ops";
import EventStreamLoading from "./loading";

export default async function HrEventStreamPage() {
  await requirePermission("hr:eventstream:view");
  const state = await prefetchHrEventStream();
  return (
    <Suspense fallback={<EventStreamLoading />}>
      <HydrationBoundary state={state}>
        <EventStreamPageContent />
      </HydrationBoundary>
    </Suspense>
  );
}
