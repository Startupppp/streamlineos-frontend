import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function DistributeLeadsLoading() {
  return (
    <PageWrapper title="Distribute Leads" subtitle="Assign leads across your team.">
      <div className="space-y-6">
        <div className="flex items-center justify-end">
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-[300px] rounded-lg" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-[300px] rounded-lg" />
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
