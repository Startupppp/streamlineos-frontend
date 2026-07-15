import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function WhiteboardLoading() {
  return (
    <PageWrapper
      title="Whiteboard"
      noInternalScroll
      contentClassName="flex min-h-0"
    >
      <div className="flex flex-1 min-h-0">
        <div className="w-48 shrink-0 border-r border-border pr-3 hidden md:flex md:flex-col gap-1 py-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-md" />
          ))}
        </div>
        <Skeleton className="flex-1 rounded-none" />
      </div>
    </PageWrapper>
  );
}
