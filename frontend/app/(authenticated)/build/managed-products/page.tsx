import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ManagedProductsPage } from "@/features/build/managed-products/managed-products-page";
import { prefetchBuildManagedProducts } from "@/lib/prefetch/build-portfolio";
import ManagedProductsLoading from "./loading";

export default async function ManagedProductsRoute() {
  await enforceRouteAccess("/build/managed-products");
  const state = await prefetchBuildManagedProducts();
  return (
    <Suspense fallback={<ManagedProductsLoading />}>
      <HydrationBoundary state={state}>
        <ManagedProductsPage />
      </HydrationBoundary>
    </Suspense>
  );
}
