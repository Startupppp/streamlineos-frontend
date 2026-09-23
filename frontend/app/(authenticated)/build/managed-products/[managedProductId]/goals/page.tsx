import { notFound } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProductGoalsPage } from "@/features/build/managed-products/product-goals-page";

export const metadata = {
  title: "Goals | Product",
};

interface Props {
  params: Promise<{ managedProductId: string }>;
}

export default async function ProductGoalsRoute({ params }: Props) {
  await enforceRouteAccess("/build/managed-products/[managedProductId]/goals");
  const { managedProductId } = await params;
  const parsed = Number(managedProductId);
  if (!Number.isInteger(parsed) || parsed <= 0) notFound();
  return <ProductGoalsPage managedProductId={parsed} />;
}
