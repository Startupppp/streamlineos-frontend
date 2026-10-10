import { notFound } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
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
  if (!Number.isInteger(parsed) || parsed <= 0) notFound();
  return <ProductProjectsPage managedProductId={parsed} />;
}
