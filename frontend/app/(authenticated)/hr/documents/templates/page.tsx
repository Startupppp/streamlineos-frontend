import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { TemplatesListPage } from "@/features/hr/documents/templates-list-page";
import DocumentTemplatesLoading from "./loading";

export default async function HrDocumentTemplatesPage() {
  await requirePermission("hr:documents:view");
  return (
    <Suspense fallback={<DocumentTemplatesLoading />}>
      <TemplatesListPage />
    </Suspense>
  );
}
