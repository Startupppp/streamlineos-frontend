import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrBackgroundVerifications } from "@/lib/prefetch/hr-people";
import { BackgroundVerificationPageClient } from "@/features/hr/background-verification/background-verification-page-client";
import BackgroundVerificationLoading from "./loading";

async function BackgroundVerificationHydrated() {
  const state = await prefetchHrBackgroundVerifications();
  return (
    <HydrationBoundary state={state}>
      <BackgroundVerificationPageClient />
    </HydrationBoundary>
  );
}

export default async function BackgroundVerificationPage() {
  await requirePermission("hr:sensitive:view");
  return (
    <Suspense fallback={<BackgroundVerificationLoading />}>
      <BackgroundVerificationHydrated />
    </Suspense>
  );
}
