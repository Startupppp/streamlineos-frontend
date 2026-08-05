import { MyExpensesPage } from "@/features/employee-self-service";
import { requirePermission } from "@/lib/rbac/require-permission";

export default async function EmployeeExpensesPage() {
  await requirePermission("self:expenses");
  return <MyExpensesPage />;
}
