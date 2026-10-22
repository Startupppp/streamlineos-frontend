import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { IdentityPageContent } from "@/features/hr/enterprise/ops/identity/identity-page-content";
import { prefetchHrIdentity } from "@/lib/prefetch/hr-ops";
import IdentityLoading from "./loading";

export default async function HrIdentityPage() {
  await requirePermission("hr:identity:view");
  const state = await prefetchHrIdentity();
  return (
    <Suspense fallback={<IdentityLoading />}>
      <HydrationBoundary state={state}>
        <IdentityPageContent />
      </HydrationBoundary>
    </Suspense>
  );
}
