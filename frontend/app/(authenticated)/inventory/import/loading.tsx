import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function ImportLoading() {
  return (
    <PageWrapper title="Import & Export">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-sm" />
          <Skeleton className="h-9 w-24 rounded-sm" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </PageWrapper>
  );
}
