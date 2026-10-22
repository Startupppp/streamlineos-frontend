import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { HrFormsSettingsPage } from "@/features/hr/forms/components/hr-forms-settings-page";
import { prefetchHrForms } from "@/lib/prefetch/hr-time";
import FormsSettingsLoading from "./loading";

async function FormsHydrated() {
  const state = await prefetchHrForms();
  return (
    <HydrationBoundary state={state}>
      <HrFormsSettingsPage />
    </HydrationBoundary>
  );
}

export default async function Page() {
  await requirePermission("hr:forms:view");
  return (
    <Suspense fallback={<FormsSettingsLoading />}>
      <FormsHydrated />
    </Suspense>
  );
}
