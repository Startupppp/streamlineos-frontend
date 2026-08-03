import { requirePermission } from "@/lib/rbac/require-permission";
import { DocumentsPage } from "@/features/hr/documents/documents-page";

export default async function HrDocumentsPage() {
  await requirePermission("hr:documents:view");
  return <DocumentsPage />;
}
