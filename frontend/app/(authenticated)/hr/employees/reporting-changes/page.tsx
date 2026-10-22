import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { BulkReportingChangePage } from "@/features/hr/reporting-managers/bulk/bulk-reporting-change-page";
import BulkReportingChangeLoading from "./loading";

export default async function Page() {
  await requirePermission("hr:reporting-lines:manage");
  return (
    <Suspense fallback={<BulkReportingChangeLoading />}>
      <BulkReportingChangePage />
    </Suspense>
  );
}
