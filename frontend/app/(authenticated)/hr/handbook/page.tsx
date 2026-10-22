import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrHandbook } from "@/lib/prefetch/hr-people";
import { HandbookPageClient } from "@/features/hr/handbook/handbook-page-client";
import HandbookLoading from "./loading";

async function HandbookHydrated() {
  const state = await prefetchHrHandbook();
  return (
    <HydrationBoundary state={state}>
      <HandbookPageClient />
    </HydrationBoundary>
  );
}

export default async function HandbookPage() {
  await requirePermission("hr:documents:manage");
  return (
    <Suspense fallback={<HandbookLoading />}>
      <HandbookHydrated />
    </Suspense>
  );
}
