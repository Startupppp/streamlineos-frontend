import { requirePermission } from "@/lib/rbac/require-permission";
import { EmailTemplatesPageClient } from "@/features/hr/email-templates/email-templates-page-client";

export default async function EmailTemplatesPage() {
  await requirePermission("hr:email-templates:manage");
  return <EmailTemplatesPageClient />;
}
