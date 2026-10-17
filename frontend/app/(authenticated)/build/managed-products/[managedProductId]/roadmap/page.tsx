import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ManagedProductNotFound } from "@/features/build/managed-products/managed-product-detail-layout";
import { ProductRoadmapPage } from "@/features/build/managed-products/product-roadmap-page";

export const metadata = {
  title: "Roadmap | Product",
};

interface Props {
  params: Promise<{ managedProductId: string }>;
}

export default async function ProductRoadmapRoute({ params }: Props) {
  await enforceRouteAccess("/build/managed-products/[managedProductId]/roadmap");
  const { managedProductId } = await params;
  const parsed = Number(managedProductId);
  if (!Number.isInteger(parsed) || parsed <= 0) return <ManagedProductNotFound />;
  return <ProductRoadmapPage managedProductId={parsed} />;
}
