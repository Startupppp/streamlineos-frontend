import { requirePermission } from "@/lib/rbac/require-permission";
import { VendorsPage } from "@/features/recruitment/vendors-page";

export default async function Page() {
  await requirePermission("hr:requisitions:view");
  return <VendorsPage />;
}
