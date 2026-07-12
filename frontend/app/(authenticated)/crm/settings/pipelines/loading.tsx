import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function PipelinesLoading() {
  return (
    <PageWrapper
      title="Pipelines"
      subtitle="Configure deal and lead pipelines and their stages"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
    >
      <div className="flex gap-0 border border-border rounded-xl overflow-hidden h-[480px]">
        <div className="w-[280px] shrink-0 border-r border-border space-y-2 p-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
        <div className="flex-1 space-y-2 p-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full rounded-md" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
