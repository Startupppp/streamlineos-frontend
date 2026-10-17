import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ManagedProductNotFound } from "@/features/build/managed-products/managed-product-detail-layout";
import { ManagedProductOverviewPage } from "@/features/build/overview/managed-product-overview-page";

export default async function ManagedProductOverviewRoute({
  params,
}: {
  params: Promise<{ managedProductId: string }>;
}) {
  await enforceRouteAccess("/build/managed-products/[managedProductId]");
  const { managedProductId } = await params;
  const id = Number(managedProductId);
  if (!Number.isInteger(id) || id <= 0) return <ManagedProductNotFound />;
  return <ManagedProductOverviewPage managedProductId={id} />;
}
