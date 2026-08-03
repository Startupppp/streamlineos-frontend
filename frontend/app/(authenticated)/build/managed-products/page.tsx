import { requirePermission } from "@/lib/rbac/require-permission";
import { ManagedProductsPage } from "@/features/build/managed-products/managed-products-page";

export default async function ManagedProductsRoute() {
  await requirePermission("build:managed-products:view");
  return <ManagedProductsPage />;
}
