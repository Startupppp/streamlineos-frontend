import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ManagedProductNotFound } from "@/features/build/managed-products/managed-product-detail-layout";
import { ProductReleasesPage } from "@/features/build/managed-products/releases/product-releases-page";

export const metadata = {
  title: "Releases | Product",
};

interface Props {
  params: Promise<{ managedProductId: string }>;
}

export default async function ProductReleasesRoute({ params }: Props) {
  await enforceRouteAccess("/build/managed-products/[managedProductId]/releases");
  const { managedProductId } = await params;
  const parsed = Number(managedProductId);
  if (!Number.isInteger(parsed) || parsed <= 0) return <ManagedProductNotFound />;
  return <ProductReleasesPage managedProductId={parsed} />;
}
