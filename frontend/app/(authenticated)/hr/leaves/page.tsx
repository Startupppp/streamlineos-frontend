import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { LeavesWfhContent } from "@/features/hr/leaves/components/leaves-wfh-content";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchLeaveContext } from "@/lib/prefetch/hr-time";
import LeavesLoading from "./loading";

async function LeavesHydrated() {
  const state = await prefetchLeaveContext();
  return (
    <HydrationBoundary state={state}>
      <LeavesWfhContent />
    </HydrationBoundary>
  );
}

export default async function LeavesPage() {
  await requirePermission(["self:leaves", "hr:leaves:view"]);
  return (
    <Suspense fallback={<LeavesLoading />}>
      <LeavesHydrated />
    </Suspense>
  );
}
