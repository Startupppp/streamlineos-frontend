import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { FnfPageClient } from "@/features/hr/fnf/fnf-page-client";
import FnfLoading from "./loading";

export default async function FnfPage() {
  await requirePermission("hr:payroll:approve");
  return (
    <Suspense fallback={<FnfLoading />}>
      <FnfPageClient />
    </Suspense>
  );
}
