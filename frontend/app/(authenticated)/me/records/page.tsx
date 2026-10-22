import { Suspense } from "react";
import { MyDocumentsPage } from "@/features/hr/document-review/my-documents-page";
import { MyOnboardingTasksPage } from "@/features/hr/onboarding/my-onboarding-tasks-page";
import { SelfServiceHub, SelfServiceHubTabs } from "@/features/me/hubs/self-service-hub";
import { SelfServiceHubSkeleton } from "@/features/me/hubs/self-service-hub-skeleton";
import { requireSession } from "@/lib/rbac/require-permission";

export default async function RecordsPage() {
  await requireSession();
  const hubChrome = {
    title: "Documents & Onboarding",
    subtitle: "Manage employment documents and onboarding tasks.",
    tabs: <SelfServiceHubTabs />,
  };
  return (
    <Suspense fallback={<SelfServiceHubSkeleton title={hubChrome.title} />}>
      <SelfServiceHub
        hub="records"
        content={{
          documents: <MyDocumentsPage hubChrome={hubChrome} />,
          onboarding: <MyOnboardingTasksPage hubChrome={hubChrome} />,
        }}
      />
    </Suspense>
  );
}
