import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChannelsLoading() {
  return (
    <PageWrapper
      title="Channels"
      actions={<Skeleton className="h-4 w-28" />}
    >
      <div className="space-y-1">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full rounded" />
        ))}
      </div>
    </PageWrapper>
  );
}
