import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { WebhooksPage } from "@/features/settings/webhooks/webhooks-page";

export default async function Page() {
  await requirePermission("settings:webhooks:manage");
  return (
    <Suspense>
      <WebhooksPage />
    </Suspense>
  );
}
