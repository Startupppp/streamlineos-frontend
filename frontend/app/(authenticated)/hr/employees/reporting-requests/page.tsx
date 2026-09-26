import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { ReportingRequestsPage } from "@/features/hr/reporting-managers/requests/reporting-requests-page";

export default async function Page() {
  await requirePermission("hr:reporting-lines:review");
  return (
    <Suspense>
      <ReportingRequestsPage />
    </Suspense>
  );
}
