import { MyDocumentsPage } from "@/features/employee-self-service";
import { requireSession } from "@/lib/rbac/require-permission";

export default async function EmployeeDocumentsPage() {
  await requireSession();
  return <MyDocumentsPage />;
}
