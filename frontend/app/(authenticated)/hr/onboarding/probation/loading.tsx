import { PageWrapper } from "@/components/ui/page-wrapper";
import { ProbationSkeleton } from "@/features/hr/onboarding/onboarding-route-skeletons";

export default function ProbationLoading() {
  return (
    <PageWrapper title="Probation Reviews" subtitle="Employees due for review or confirmation" backHref="/hr/onboarding">
      <ProbationSkeleton />
    </PageWrapper>
  );
}
