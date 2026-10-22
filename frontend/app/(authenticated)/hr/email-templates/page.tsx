import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrEmailTemplates } from "@/lib/prefetch/hr-people";
import { EmailTemplatesPageClient } from "@/features/hr/email-templates/email-templates-page-client";
import EmailTemplatesLoading from "./loading";

async function EmailTemplatesHydrated() {
  const state = await prefetchHrEmailTemplates();
  return (
    <HydrationBoundary state={state}>
      <EmailTemplatesPageClient />
    </HydrationBoundary>
  );
}

export default async function EmailTemplatesPage() {
  await requirePermission("hr:email-templates:manage");
  return (
    <Suspense fallback={<EmailTemplatesLoading />}>
      <EmailTemplatesHydrated />
    </Suspense>
  );
}
