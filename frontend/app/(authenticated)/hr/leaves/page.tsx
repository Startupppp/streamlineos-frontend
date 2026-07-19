import { Suspense } from "react";
import { LeavesWfhContent } from "@/features/hr/leaves/components/leaves-wfh-content";
import { requirePermission } from "@/lib/rbac/require-permission";

export default async function LeavesPage() {
  await requirePermission(["self:leaves", "hr:leaves:view"]);
  return (
    <Suspense>
      <LeavesWfhContent />
    </Suspense>
  );
}
