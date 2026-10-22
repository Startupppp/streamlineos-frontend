import { PAGE_BODY_SKELETON_CLASS } from "@/components/ui/content-fill-panel";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export function SelfServiceHubSkeleton({ title = "My work", tabCount = 2 }: { title?: string; tabCount?: number }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col" role="status" aria-label={`Loading ${title}`}>
      <PageWrapper
        title={title}
        subtitle="Loading your information…"
        noInternalScroll
        contentClassName="flex min-h-0 flex-1 flex-col"
        filters={
          <div className="flex w-full items-center gap-2 rounded-md border border-input bg-card p-1 md:w-fit">
            {Array.from({ length: tabCount }, (_, index) => (
              <Skeleton key={index} className="h-8 w-20 rounded-sm" />
            ))}
          </div>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="grid shrink-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-24 rounded-xl" />
            ))}
          </div>
          <div className={PAGE_BODY_SKELETON_CLASS}>
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </PageWrapper>
    </div>
  );
}
