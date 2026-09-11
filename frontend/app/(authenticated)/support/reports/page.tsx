import { requirePermission } from "@/lib/rbac/require-permission";
import { SupportOverviewPage } from "@/features/support/reports/support-overview-page";

export default async function Page() {
  await requirePermission("support:reports:view");
  return <SupportOverviewPage />;
}
