import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { SupportQueuesPage } from "@/features/employee-support";
import { prefetchHrHelpdesk } from "@/lib/prefetch/hr";
import HrEmployeeSupportLoading from "./loading";

export default async function HrEmployeeSupportPage() {
  await requirePermission("hr:helpdesk:view");
  const state = await prefetchHrHelpdesk();
  return (
    <Suspense fallback={<HrEmployeeSupportLoading />}>
      <HydrationBoundary state={state}>
        <SupportQueuesPage />
      </HydrationBoundary>
    </Suspense>
  );
}
