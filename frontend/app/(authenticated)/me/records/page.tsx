import { Suspense } from "react";
import { MyDocumentsPage } from "@/features/hr/document-review/my-documents-page";
import { MyOnboardingTasksPage } from "@/features/hr/onboarding/my-onboarding-tasks-page";
import { SelfServiceHub, SelfServiceSectionSelector } from "@/features/me/hubs/self-service-hub";
import { SelfServiceHubSkeleton } from "@/features/me/hubs/self-service-hub-skeleton";
import { requireSession } from "@/lib/rbac/require-permission";

export default async function RecordsPage() {
  await requireSession();
  return (
    <Suspense fallback={<SelfServiceHubSkeleton title="My documents" />}>
      <SelfServiceHub
        hub="records"
        content={{
          documents: <MyDocumentsPage sectionSelector={<SelfServiceSectionSelector />} />,
          onboarding: <MyOnboardingTasksPage sectionSelector={<SelfServiceSectionSelector />} />,
        }}
      />
    </Suspense>
  );
}
