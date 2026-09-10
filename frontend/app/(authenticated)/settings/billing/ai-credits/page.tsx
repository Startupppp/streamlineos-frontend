import type { Metadata } from "next";
import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { AiCreditsSettingsPage } from "@/features/billing/ai-credits-settings-page";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchAiCreditsSettings } from "@/lib/prefetch/settings-billing";

export const metadata: Metadata = {
  title: "AI Credits | StreamlineOS",
};

export default async function AiCreditsSettingsRoute() {
  await requirePermission("billing:ai-credits:view");
  const state = await prefetchAiCreditsSettings();
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <AiCreditsSettingsPage />
      </HydrationBoundary>
    </Suspense>
  );
}
