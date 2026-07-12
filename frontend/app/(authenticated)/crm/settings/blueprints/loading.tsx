import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function BlueprintsLoading() {
  return (
    <PageWrapper
      title="Blueprints"
      subtitle="Configure stage transition rules for pipelines"
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
    >
      <div className="flex gap-4">
        <div className="w-[250px] shrink-0 space-y-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </div>
        <div className="flex-1 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
