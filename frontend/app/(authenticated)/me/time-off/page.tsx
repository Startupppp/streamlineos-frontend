import { Suspense } from "react";
import { LeavesWfhContent } from "@/features/hr/leaves/components/leaves-wfh-content";
import { requirePermission } from "@/lib/rbac/require-permission";

export default async function MyTimeOffPage() {
  await requirePermission("self:leaves");
  return (
    <Suspense>
      <LeavesWfhContent selfService />
    </Suspense>
  );
}
