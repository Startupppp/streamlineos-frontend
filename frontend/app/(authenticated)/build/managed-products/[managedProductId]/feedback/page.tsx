import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ManagedProductNotFound } from "@/features/build/managed-products/managed-product-detail-layout";
import { ProductFeedbackPage } from "@/features/build/managed-products/product-feedback-page";

export const metadata = {
  title: "Feedback | Product",
};

interface Props {
  params: Promise<{ managedProductId: string }>;
}

export default async function ProductFeedbackRoute({ params }: Props) {
  await enforceRouteAccess("/build/managed-products/[managedProductId]/feedback");
  const { managedProductId } = await params;
  const parsed = Number(managedProductId);
  if (!Number.isInteger(parsed) || parsed <= 0) return <ManagedProductNotFound />;
  return <ProductFeedbackPage managedProductId={parsed} />;
}
