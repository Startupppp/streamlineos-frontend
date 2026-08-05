import { MyRecruitmentPage } from "@/features/employee-self-service";
import { requirePermission } from "@/lib/rbac/require-permission";

export default async function EmployeeRecruitmentPage() {
  await requirePermission("self:recruitment");
  return <MyRecruitmentPage />;
}
