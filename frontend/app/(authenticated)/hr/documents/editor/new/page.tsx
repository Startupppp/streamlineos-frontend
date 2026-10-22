import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { DocumentEditorNewPage } from "@/features/hr/documents/document-editor-new-page";
import NewDocumentLoading from "./loading";

export default async function HrDocumentEditorNewPage() {
  await requirePermission("hr:documents:manage");
  return (
    <Suspense fallback={<NewDocumentLoading />}>
      <DocumentEditorNewPage />
    </Suspense>
  );
}
