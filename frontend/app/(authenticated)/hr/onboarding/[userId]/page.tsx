import { requirePermission } from "@/lib/rbac/require-permission";
import { OnboardingDetailPage } from "@/features/hr/onboarding/onboarding-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requirePermission("hr:onboarding:tasks:view");
  const { userId } = await params;
  return <OnboardingDetailPage userId={userId} />;
}
