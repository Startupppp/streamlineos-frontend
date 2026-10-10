import { notFound } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProductSettingsPage } from "@/features/build/managed-products/product-settings-page";

export const metadata = {
  title: "Settings | Product",
};

interface Props {
  params: Promise<{ managedProductId: string }>;
}

export default async function ProductSettingsRoute({ params }: Props) {
  await enforceRouteAccess("/build/managed-products/[managedProductId]/settings");
  const { managedProductId } = await params;
  const parsed = Number(managedProductId);
  if (!Number.isInteger(parsed) || parsed <= 0) notFound();
  return <ProductSettingsPage managedProductId={parsed} />;
}
