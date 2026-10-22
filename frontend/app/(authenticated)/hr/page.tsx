import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { prefetchHrHub } from "@/lib/prefetch/hr-talent";
import { HrHubPage } from "@/features/hr/hub/hr-hub-page";
import HrLoading from "./loading";

async function HrHubHydrated() {
  const state = await prefetchHrHub();
  return (
    <HydrationBoundary state={state}>
      <HrHubPage />
    </HydrationBoundary>
  );
}

export default function HRPage() {
  return (
    <Suspense fallback={<HrLoading />}>
      <HrHubHydrated />
    </Suspense>
  );
}
