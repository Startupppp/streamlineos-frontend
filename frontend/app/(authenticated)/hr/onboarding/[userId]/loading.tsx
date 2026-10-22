import { PageWrapper } from "@/components/ui/page-wrapper";
import { OnboardingDetailSkeleton } from "@/features/hr/onboarding/onboarding-route-skeletons";

export default function OnboardingDetailLoading() {
  return (
    <PageWrapper title="Employee onboarding" subtitle="Track and manage onboarding tasks for this employee." backHref="/hr/onboarding">
      <OnboardingDetailSkeleton />
    </PageWrapper>
  );
}
