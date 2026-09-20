import { requirePermission } from "@/lib/rbac/require-permission";
import { VendorsPage } from "@/features/hr/recruitment/vendors-page";

export default async function Page() {
  await requirePermission("hr:employees:manage");
  return <VendorsPage />;
}
