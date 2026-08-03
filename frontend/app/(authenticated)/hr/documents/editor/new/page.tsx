import { requirePermission } from "@/lib/rbac/require-permission";
import { DocumentEditorNewPage } from "@/features/hr/documents/document-editor-new-page";

export default async function HrDocumentEditorNewPage() {
  await requirePermission("hr:documents:manage");
  return <DocumentEditorNewPage />;
}
