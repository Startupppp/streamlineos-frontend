import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac/require-permission";
import { ManagedProductDetailPage } from "@/features/projects/managed-products/managed-product-detail-page";

export default async function ManagedProductDetailRoute({
  params,
}: {
  params: Promise<{ managedProductId: string }>;
}) {
  await requirePermission("projects:managed-products:view");
  const { managedProductId } = await params;
  const id = Number(managedProductId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <ManagedProductDetailPage managedProductId={id} />;
}
