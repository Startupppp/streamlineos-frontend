import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { JobsPage } from "@/features/hr/recruitment/jobs-page";
import JobsLoading from "./loading";

export default async function Page() {
  await requirePermission("hr:employees:view");
  return (
    <Suspense fallback={<JobsLoading />}>
      <JobsPage />
    </Suspense>
  );
}
