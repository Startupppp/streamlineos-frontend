import { PageWrapper } from "@/components/ui/page-wrapper";
import { BillingPageSkeleton } from "@/features/billing/components/billing-page-skeleton";

export default function SettingsBillingLoading() {
  return (
    <PageWrapper
      title="Billing & Plan"
      subtitle="Manage your subscription, payments, and billing details"
    >
      <BillingPageSkeleton />
    </PageWrapper>
  );
}
