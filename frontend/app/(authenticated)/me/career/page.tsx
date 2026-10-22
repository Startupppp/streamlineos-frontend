import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { MyJobOpeningsPage } from "@/features/employee-self-service/components/my-job-openings-page";
import { MyRecruitmentPage } from "@/features/employee-self-service/components/my-recruitment-page";
import { MyReferralsPage } from "@/features/employee-self-service/components/my-referrals-page";
import { SelfServiceHub, SelfServiceHubTabs } from "@/features/me/hubs/self-service-hub";
import { SelfServiceHubSkeleton } from "@/features/me/hubs/self-service-hub-skeleton";
import { requireSession } from "@/lib/rbac/require-permission";
import { prefetchMeCareer } from "@/lib/prefetch/me";

export default async function CareerPage() {
  await requireSession();
  const state = await prefetchMeCareer();
  const hubChrome = {
    title: "Hiring & Referrals",
    subtitle: "Manage interviews, internal jobs and referrals.",
    tabs: <SelfServiceHubTabs />,
  };
  return (
    <Suspense fallback={<SelfServiceHubSkeleton title={hubChrome.title} tabCount={3} />}>
      <HydrationBoundary state={state}>
        <SelfServiceHub
          hub="career"
          content={{
            interviews: <MyRecruitmentPage hubChrome={hubChrome} />,
            openings: <MyJobOpeningsPage hubChrome={hubChrome} />,
            referrals: <MyReferralsPage hubChrome={hubChrome} />,
          }}
        />
      </HydrationBoundary>
    </Suspense>
  );
}
