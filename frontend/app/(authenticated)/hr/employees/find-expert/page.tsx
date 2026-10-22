import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { FindExpertPage } from "@/features/hr/employees/find-expert-page";
import FindExpertLoading from "./loading";

export default async function Page() {
  await requirePermission("hr:employees:view");
  return (
    <Suspense fallback={<FindExpertLoading />}>
      <FindExpertPage />
    </Suspense>
  );
}
