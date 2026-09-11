import { OnboardingDetailPage } from "@/features/hr/onboarding/onboarding-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return <OnboardingDetailPage userId={userId} />;
}
