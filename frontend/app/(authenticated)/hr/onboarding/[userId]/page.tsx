import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrOnboardingUser } from "@/lib/prefetch/hr-people";
import { OnboardingDetailPage } from "@/features/hr/onboarding/onboarding-detail-page";
import OnboardingDetailLoading from "./loading";

async function OnboardingDetailHydrated({ userId }: { userId: string }) {
  const state = await prefetchHrOnboardingUser(userId);
  return (
    <HydrationBoundary state={state}>
      <OnboardingDetailPage userId={userId} />
    </HydrationBoundary>
  );
}

export default async function Page({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requirePermission("hr:onboarding:tasks:view");
  const { userId } = await params;
  return (
    <Suspense fallback={<OnboardingDetailLoading />}>
      <OnboardingDetailHydrated userId={userId} />
    </Suspense>
  );
}
