import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { PAGE_BODY_SKELETON_CLASS } from "@/components/ui/content-fill-panel";

export default function IncomingTransferLoading() {
  return (
    <PageWrapper
      title="Incoming Ownership Transfer"
      subtitle="Accept or decline a pending ownership transfer directed to you"
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className={PAGE_BODY_SKELETON_CLASS}>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <div className="mt-auto flex justify-end gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
