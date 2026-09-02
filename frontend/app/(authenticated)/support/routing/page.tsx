import { requirePermission } from "@/lib/rbac/require-permission";
import { RoutingPage } from "@/features/support/settings/routing-page";

export default async function Page() {
  await requirePermission("support:macros:view");
  return <RoutingPage />;
}
