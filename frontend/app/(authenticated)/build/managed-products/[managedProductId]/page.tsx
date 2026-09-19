import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac/require-permission";
import { ManagedProductOverviewPage } from "@/features/build/overview/managed-product-overview-page";

export default async function ManagedProductOverviewRoute({
  params,
}: {
  params: Promise<{ managedProductId: string }>;
}) {
  await requirePermission("build:managed-products:view");
  const { managedProductId } = await params;
  const id = Number(managedProductId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <ManagedProductOverviewPage managedProductId={id} />;
}
