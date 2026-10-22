import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { SkillsMatrixPage } from "@/features/hr/employees/skills-matrix-page";
import SkillsMatrixLoading from "./loading";

export default async function Page() {
  await requirePermission("hr:employees:view");
  return (
    <Suspense fallback={<SkillsMatrixLoading />}>
      <SkillsMatrixPage />
    </Suspense>
  );
}
