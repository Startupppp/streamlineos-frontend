import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { InboxShell } from "@/features/notifications/unified-inbox";
import { prefetchInboxCount } from "@/lib/prefetch/inbox";
import InboxLoading from "./loading";

async function InboxHydrated() {
  const state = await prefetchInboxCount();
  return (
    <HydrationBoundary state={state}>
      <InboxShell />
    </HydrationBoundary>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={<InboxLoading />}>
      <InboxHydrated />
    </Suspense>
  );
}
