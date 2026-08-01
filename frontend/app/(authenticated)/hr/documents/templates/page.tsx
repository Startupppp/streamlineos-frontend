import { requirePermission } from "@/lib/rbac/require-permission";
import { TemplatesListPage } from "@/features/hr/documents/templates-list-page";

export default async function HrDocumentTemplatesPage() {
  await requirePermission("hr:documents:view");
  return <TemplatesListPage />;
}
