import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function ImportLoading() {
  return (
    <PageWrapper title="Import & Export">
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-sm" />
          <Skeleton className="h-9 w-24 rounded-sm" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </PageWrapper>
  );
}
