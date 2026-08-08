import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function WebhookCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="h-2 w-2 shrink-0 rounded-full" />
            <Skeleton className="h-4 flex-1 max-w-[360px]" />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-9 rounded-full" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="mt-3 h-3 w-28" />
      </CardContent>
    </Card>
  );
}

export default function WebhooksLoading() {
  return (
    <PageWrapper
      title="Webhooks"
      subtitle="Send real-time events to external systems when actions occur in your organization."
      noInternalScroll
      contentClassName="pb-0"
      actions={<Skeleton className="h-9 w-32" />}
    >
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <WebhookCardSkeleton key={i} />
        ))}
      </div>
    </PageWrapper>
  );
}
