import { requirePermission } from "@/lib/rbac/require-permission";
import { AssetsPage } from "@/features/hr/assets/assets-page";

export default async function HrAssetsPage() {
  await requirePermission("hr:assets:view");
  return <AssetsPage />;
}
