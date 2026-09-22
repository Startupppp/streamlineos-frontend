import { Suspense } from "react";
import { OnboardingListPage } from "@/features/hr/onboarding/onboarding-list-page";
import OnboardingLoading from "./loading";

export default function Page() {
  return (
    <Suspense fallback={<OnboardingLoading />}>
      <OnboardingListPage />
    </Suspense>
  );
}
