import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { DocumentTypesPage } from "@/features/hr/document-types/document-types-page";
import DocumentTypesLoading from "./loading";

export default async function HrDocumentTypesPage() {
  await requirePermission("hr:documents:manage");
  return (
    <Suspense fallback={<DocumentTypesLoading />}>
      <DocumentTypesPage />
    </Suspense>
  );
}
