import { requirePermission } from "@/lib/rbac/require-permission";
import { DocumentEditorPage } from "@/features/hr/documents/document-editor-page";

export default async function HrDocumentEditorPage() {
  await requirePermission("hr:documents:manage");
  return <DocumentEditorPage />;
}
