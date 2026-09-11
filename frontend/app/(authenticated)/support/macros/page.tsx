import { requirePermission } from "@/lib/rbac/require-permission";
import { MacrosPage } from "@/features/support/macros/macros-page";

export default async function Page() {
  await requirePermission("support:macros:view");
  return <MacrosPage />;
}
