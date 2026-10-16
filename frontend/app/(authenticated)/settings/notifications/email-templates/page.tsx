import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { EmailTemplatesPage } from "@/features/notifications/admin/email-templates-page";

export default async function Page() {
  await requirePermission("settings:email-templates:manage");
  return (
    <Suspense>
      <EmailTemplatesPage />
    </Suspense>
  );
}
