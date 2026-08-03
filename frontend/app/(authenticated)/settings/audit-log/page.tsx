import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { AuditLogPage } from "@/features/settings/audit-log/audit-log-page";

export default async function Page() {
  await requirePermission("audit-log:read");
  return (
    <Suspense>
      <AuditLogPage />
    </Suspense>
  );
}
