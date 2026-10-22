import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import KbSharingSettingsPage from "@/features/wiki/components/kb-sharing-settings-page";
import { prefetchKbSharingSettings } from "@/lib/prefetch/knowledge";
import KbSharingSettingsLoading from "./loading";

async function KbSharingHydrated() {
  await requireSession();
  const state = await prefetchKbSharingSettings();
  return (
    <HydrationBoundary state={state}>
      <RequireModule module="kb">
        <KbSharingSettingsPage />
      </RequireModule>
    </HydrationBoundary>
  );
}

export default function KbManageSharingPage() {
  return (
    <Suspense fallback={<KbSharingSettingsLoading />}>
      <KbSharingHydrated />
    </Suspense>
  );
}
