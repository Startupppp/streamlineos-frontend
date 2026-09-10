import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { PersonalApiTokensPage } from "@/features/settings/api-tokens/personal-api-tokens-page";
import { prefetchUserApiTokens } from "@/lib/prefetch/settings";

export default async function PersonalApiTokensRoute() {
  await requirePermission("settings:api-tokens:read");
  const state = await prefetchUserApiTokens();
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <PersonalApiTokensPage />
      </HydrationBoundary>
    </Suspense>
  );
}
