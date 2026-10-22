import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { MyDocumentsPage } from "@/features/hr/document-review/my-documents-page";
import { MyOnboardingTasksPage } from "@/features/hr/onboarding/my-onboarding-tasks-page";
import { SelfServiceHub, SelfServiceHubTabs } from "@/features/me/hubs/self-service-hub";
import { SelfServiceHubSkeleton } from "@/features/me/hubs/self-service-hub-skeleton";
import { requireSession } from "@/lib/rbac/require-permission";
import { prefetchMeRecords } from "@/lib/prefetch/me";

export default async function RecordsPage() {
  await requireSession();
  const state = await prefetchMeRecords();
  const hubChrome = {
    title: "Documents & Onboarding",
    subtitle: "Manage employment documents and onboarding tasks.",
    tabs: <SelfServiceHubTabs />,
  };
  return (
    <Suspense fallback={<SelfServiceHubSkeleton title={hubChrome.title} />}>
      <HydrationBoundary state={state}>
        <SelfServiceHub
          hub="records"
          content={{
            documents: <MyDocumentsPage hubChrome={hubChrome} />,
            onboarding: <MyOnboardingTasksPage hubChrome={hubChrome} />,
          }}
        />
      </HydrationBoundary>
    </Suspense>
  );
}
