import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function InboxLoading() {
  return (
    <PageWrapper
      title="Candidate Inbox"
      subtitle="Messages with candidates"
    >
      <div className="flex gap-4 h-full">
        <div className="w-72 shrink-0 space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="flex-1 rounded-xl" />
      </div>
    </PageWrapper>
  );
}
