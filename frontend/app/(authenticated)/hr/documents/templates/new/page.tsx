import { Suspense } from "react";
import { TemplateEditor } from "@/features/hr/documents/template-editor";
import { requirePermission } from "@/lib/rbac/require-permission";
import NewTemplateLoading from "./loading";

export default async function NewTemplatePage() {
  await requirePermission("hr:documents:manage");
  return (
    <Suspense fallback={<NewTemplateLoading />}>
      <TemplateEditor />
    </Suspense>
  );
}
