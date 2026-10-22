import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrExitList } from "@/lib/prefetch/hr-people";
import { ExitManagementPage } from "@/features/hr/exit/exit-management-page";
import ExitLoading from "./loading";

async function ExitListHydrated() {
  const state = await prefetchHrExitList();
  return (
    <HydrationBoundary state={state}>
      <ExitManagementPage />
    </HydrationBoundary>
  );
}

export default async function HrExitPage() {
  await requirePermission("hr:exit:view");
  return (
    <Suspense fallback={<ExitLoading />}>
      <ExitListHydrated />
    </Suspense>
  );
}
