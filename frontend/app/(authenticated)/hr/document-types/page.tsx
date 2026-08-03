import { requirePermission } from "@/lib/rbac/require-permission";
import { DocumentTypesPage } from "@/features/hr/document-types/document-types-page";

export default async function HrDocumentTypesPage() {
  await requirePermission("hr:documents:manage");
  return <DocumentTypesPage />;
}
