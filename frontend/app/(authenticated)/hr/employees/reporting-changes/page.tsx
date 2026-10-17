import { requirePermission } from "@/lib/rbac/require-permission";
import { BulkReportingChangePage } from "@/features/hr/reporting-managers/bulk/bulk-reporting-change-page";

export default async function Page() {
  await requirePermission("hr:reporting-lines:manage");
  return <BulkReportingChangePage />;
}
