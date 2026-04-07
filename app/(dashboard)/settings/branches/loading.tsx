import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function BranchesLoading() {
  return (
    <PageWrapper title="Branches" subtitle="Manage your organisation's branches.">
      <div className="space-y-6">
        <div className="flex items-center justify-end">
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
