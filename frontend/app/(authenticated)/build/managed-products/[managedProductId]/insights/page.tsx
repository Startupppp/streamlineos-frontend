import { notFound } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProductInsightsPage } from "@/features/build/managed-products/product-insights-page";

export const metadata = {
  title: "Insights | Product",
};

interface Props {
  params: Promise<{ managedProductId: string }>;
}

export default async function ProductInsightsRoute({ params }: Props) {
  await enforceRouteAccess("/build/managed-products/[managedProductId]/insights");
  const { managedProductId } = await params;
  const parsed = Number(managedProductId);
  if (!Number.isInteger(parsed) || parsed <= 0) notFound();
  return <ProductInsightsPage managedProductId={parsed} />;
}
