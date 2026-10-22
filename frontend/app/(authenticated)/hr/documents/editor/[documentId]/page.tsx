import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { DocumentEditorPage } from "@/features/hr/documents/document-editor-page";
import DocumentEditorLoading from "./loading";

export default async function HrDocumentEditorPage() {
  await requirePermission("hr:documents:manage");
  return (
    <Suspense fallback={<DocumentEditorLoading />}>
      <DocumentEditorPage />
    </Suspense>
  );
}
