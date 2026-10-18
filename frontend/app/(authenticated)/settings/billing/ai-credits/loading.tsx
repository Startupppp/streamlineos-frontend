import { PageWrapper } from "@/components/ui/page-wrapper";
import { AiCreditsPageSkeleton } from "@/features/billing/ai-credits-page-skeleton";

export default function SettingsAiCreditsLoading() {
  return (
    <PageWrapper
      title="AI Credits"
      subtitle="Token-metered AI usage and credit wallet"
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <AiCreditsPageSkeleton />
    </PageWrapper>
  );
}
