import { TemplateEditor } from "@/features/hr/documents/template-editor";
import { requirePermission } from "@/lib/rbac/require-permission";

export default async function NewTemplatePage() {
  await requirePermission("hr:documents:manage");
  return <TemplateEditor />;
}
