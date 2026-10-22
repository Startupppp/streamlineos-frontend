import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { CustomFieldsSettingsPage } from "@/features/hr/custom-fields/custom-fields-settings-page";
import { prefetchHrCustomFields } from "@/lib/prefetch/hr-time";
import CustomFieldsSettingsLoading from "./loading";

async function CustomFieldsHydrated() {
  const state = await prefetchHrCustomFields();
  return (
    <HydrationBoundary state={state}>
      <CustomFieldsSettingsPage />
    </HydrationBoundary>
  );
}

export default async function Page() {
  await requirePermission("hr:custom-fields:manage");
  return (
    <Suspense fallback={<CustomFieldsSettingsLoading />}>
      <CustomFieldsHydrated />
    </Suspense>
  );
}
