import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { PrivacyRequestsPage } from "@/features/settings/privacy/privacy-requests-page";

export default async function Page() {
  await requirePermission(["hr:retention:manage", "compliance:subject-requests:view"]);
  return (
    <Suspense>
      <PrivacyRequestsPage />
    </Suspense>
  );
}
