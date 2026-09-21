import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ManagedProductsPage } from "@/features/build/managed-products/managed-products-page";

export default async function ManagedProductsRoute() {
  await enforceRouteAccess("/build/managed-products");
  return <ManagedProductsPage />;
}
