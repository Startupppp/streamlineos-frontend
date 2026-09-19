import { notFound } from "next/navigation";
import { requireModulePermission } from "@/lib/rbac/require-permission";
import { ProductGoalsPage } from "@/features/build/managed-products/product-goals-page";

export const metadata = {
  title: "Goals | Product",
};

interface Props {
  params: Promise<{ managedProductId: string }>;
}

export default async function ProductGoalsRoute({ params }: Props) {
  await requireModulePermission("build", "build:goals:view");
  const { managedProductId } = await params;
  const parsed = Number(managedProductId);
  if (!Number.isInteger(parsed) || parsed <= 0) notFound();
  return <ProductGoalsPage managedProductId={parsed} />;
}
