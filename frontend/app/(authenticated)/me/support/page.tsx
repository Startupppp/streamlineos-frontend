import { MySupportPage } from "@/features/employee-support";
import { requireSession } from "@/lib/rbac/require-permission";

export default async function EmployeeSupportPage() {
  await requireSession();
  return <MySupportPage />;
}
