import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { RolesPage } from "@/features/settings/roles/roles-page";

export default async function Page() {
  await requirePermission("settings:rbac:manage");
  return (
    <Suspense>
      <RolesPage />
    </Suspense>
  );
}
