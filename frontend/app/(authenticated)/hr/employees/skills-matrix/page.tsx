import { requirePermission } from "@/lib/rbac/require-permission";
import { SkillsMatrixPage } from "@/features/hr/employees/skills-matrix-page";

export default async function Page() {
  await requirePermission("hr:employees:view");
  return <SkillsMatrixPage />;
}
