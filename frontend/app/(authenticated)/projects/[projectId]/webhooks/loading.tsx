import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function WebhooksLoading() {
  return (
    <PageWrapper
      title="Webhooks"
      eyebrow="Project"
      subtitle="Receive HTTP POST notifications when project events occur"
      actions={<Skeleton className="h-8 w-32 rounded-md" />}
    >
      <div className="max-w-2xl mx-auto space-y-3 pb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    </PageWrapper>
  );
}
