import { MyRecruitmentPage } from "@/features/employee-self-service";
import { requireSession } from "@/lib/rbac/require-permission";

export default async function EmployeeRecruitmentPage() {
  await requireSession();
  return <MyRecruitmentPage />;
}
