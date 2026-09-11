import { requirePermission } from "@/lib/rbac/require-permission";
import { SupportSlaPage } from "@/features/support/settings/sla-page";

export default async function Page() {
  await requirePermission("support:settings:manage");
  return <SupportSlaPage />;
}
