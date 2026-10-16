import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchEmailTemplatePreviews } from "@/lib/prefetch/settings-notifications";
import { EmailTemplatesPage } from "@/features/notifications/admin/email-templates-page";

export default async function Page() {
  await requirePermission("settings:email-templates:manage");
  const state = await prefetchEmailTemplatePreviews();
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <EmailTemplatesPage />
      </HydrationBoundary>
    </Suspense>
  );
}
