import { requirePermission } from "@/lib/rbac/require-permission";
import { ManagedProductsPage } from "@/features/projects/managed-products/managed-products-page";

export default async function ManagedProductsRoute() {
  await requirePermission("projects:managed-products:view");
  return <ManagedProductsPage />;
}
