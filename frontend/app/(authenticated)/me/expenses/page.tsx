import { MyExpensesPage } from "@/features/employee-self-service";
import { requireSession } from "@/lib/rbac/require-permission";

export default async function EmployeeExpensesPage() {
  await requireSession();
  return <MyExpensesPage />;
}
