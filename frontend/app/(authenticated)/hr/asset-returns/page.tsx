import { requirePermission } from "@/lib/rbac/require-permission";
import { AssetReturnsPage } from "@/features/hr/asset-returns/asset-returns-page";

export default async function HrAssetReturnsPage() {
  await requirePermission("hr:assets:view");
  return <AssetReturnsPage />;
}
