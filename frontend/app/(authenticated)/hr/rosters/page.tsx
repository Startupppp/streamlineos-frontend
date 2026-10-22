import { requirePermission } from "@/lib/rbac/require-permission";
import { RostersPage } from "@/features/hr/rosters/rosters-page";

export default async function Page() {
  await requirePermission("hr:attendance:view");
  return <RostersPage />;
}
