import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { OrgHubClient } from "@/features/hr/org/org-hub-client";
import OrgHubLoading from "./loading";

export default async function OrgHubPage() {
  await requirePermission("hr:employees:view");
  return (
    <Suspense fallback={<OrgHubLoading />}>
      <OrgHubClient />
    </Suspense>
  );
}
