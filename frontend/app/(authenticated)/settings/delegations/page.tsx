import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { DelegationsPage } from "@/features/settings/delegations/delegations-page";

export default async function Page() {
  await requirePermission("settings:rbac:manage");
  return (
    <Suspense>
      <DelegationsPage />
    </Suspense>
  );
}
