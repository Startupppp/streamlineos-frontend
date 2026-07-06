import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectMeetingDetailLoading() {
  return (
    <PageWrapper title="Meeting" eyebrow="Project">
      <div className="px-4 pb-8 space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-28 w-full rounded-lg" />
        </div>
        <div className="border-t pt-6 space-y-2">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
        <div className="border-t pt-6 space-y-2">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </div>
    </PageWrapper>
  );
}
