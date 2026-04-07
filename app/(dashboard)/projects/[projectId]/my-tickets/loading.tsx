import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function MyTicketsLoading() {
  return (
    <PageWrapper title="My Tickets" subtitle="Tickets assigned to you">
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </PageWrapper>
  );
}
