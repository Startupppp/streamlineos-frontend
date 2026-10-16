import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { QuarantinePage } from "@/features/settings/storage-quarantine/quarantine-page";

export default async function Page() {
  await requirePermission("storage:quarantine:view");
  return (
    <Suspense>
      <QuarantinePage />
    </Suspense>
  );
}
