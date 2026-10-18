import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { WebhookCardSkeleton } from "@/features/settings/webhooks/webhook-card";

export default function WebhooksLoading() {
  return (
    <PageWrapper
      title="Webhooks"
      subtitle="Send real-time events to external systems when actions occur in your organization."
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
      actions={<Skeleton className="h-9 w-32" />}
    >
      <div className="flex min-h-0 flex-1 flex-col space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <WebhookCardSkeleton key={i} />
        ))}
      </div>
    </PageWrapper>
  );
}
