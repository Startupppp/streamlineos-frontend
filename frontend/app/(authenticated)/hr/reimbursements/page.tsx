import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { ReimbursementsPage } from "@/features/hr/reimbursements/reimbursements-page";
import { prefetchHrReimbursements } from "@/lib/prefetch/hr";
import ReimbursementsLoading from "./loading";

export default async function HrReimbursementsPage() {
  await requirePermission("hr:payroll:view");
  const state = await prefetchHrReimbursements();
  return (
    <Suspense fallback={<ReimbursementsLoading />}>
      <HydrationBoundary state={state}>
        <ReimbursementsPage />
      </HydrationBoundary>
    </Suspense>
  );
}
