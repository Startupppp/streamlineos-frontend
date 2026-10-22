import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { GeofencingPage } from "@/features/hr/geofencing/geofencing-page";
import { prefetchGeofences } from "@/lib/prefetch/hr-time";
import GeofencingLoading from "./loading";

async function GeofencingHydrated() {
  const state = await prefetchGeofences();
  return (
    <HydrationBoundary state={state}>
      <GeofencingPage />
    </HydrationBoundary>
  );
}

export default async function Page() {
  await requirePermission("hr:attendance:view");
  return (
    <Suspense fallback={<GeofencingLoading />}>
      <GeofencingHydrated />
    </Suspense>
  );
}
