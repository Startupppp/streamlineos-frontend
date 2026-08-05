import { MyDocumentsPage } from "@/features/employee-self-service";
import { requirePermission } from "@/lib/rbac/require-permission";

export default async function EmployeeDocumentsPage() {
  await requirePermission("self:onboarding-docs");
  return <MyDocumentsPage />;
}
