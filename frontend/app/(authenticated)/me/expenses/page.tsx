import { MyExpensesPage } from "@/features/hr/expenses/my-expenses-page";
import { requireSession } from "@/lib/rbac/require-permission";

export default async function EmployeeExpensesPage() {
  await requireSession();
  return <MyExpensesPage />;
}
