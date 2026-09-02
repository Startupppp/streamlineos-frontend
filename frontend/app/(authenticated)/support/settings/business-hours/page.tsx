import { requirePermission } from "@/lib/rbac/require-permission";
import { BusinessHoursPage } from "@/features/support/settings/business-hours-page";

export default async function Page() {
  await requirePermission("support:settings:manage");
  return <BusinessHoursPage />;
}
