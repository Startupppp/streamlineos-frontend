import { MyDocumentsPage } from "@/features/hr/document-review/my-documents-page";
import { requireSession } from "@/lib/rbac/require-permission";

export default async function EmployeeDocumentsPage() {
  await requireSession();
  return <MyDocumentsPage />;
}
