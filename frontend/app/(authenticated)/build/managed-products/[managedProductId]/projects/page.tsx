import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ManagedProductNotFound } from "@/features/build/managed-products/managed-product-detail-layout";
import { ProductProjectsPage } from "@/features/build/managed-products/projects/product-projects-page";

export const metadata = {
  title: "Projects | Product",
};

interface Props {
  params: Promise<{ managedProductId: string }>;
}

export default async function ManagedProductProjectsRoute({ params }: Props) {
  await enforceRouteAccess("/build/managed-products/[managedProductId]/projects");
  const { managedProductId } = await params;
  const parsed = Number(managedProductId);
  if (!Number.isInteger(parsed) || parsed <= 0) return <ManagedProductNotFound />;
  return <ProductProjectsPage managedProductId={parsed} />;
}
