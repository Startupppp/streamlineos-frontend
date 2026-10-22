import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function EffectiveRulePreviewLoading() {
  return (
    <PageWrapper
      title="Effective Rule Preview"
      subtitle="See which HR policy applies to an employee on a given date"
    >
      <div className="py-4 space-y-4">
        <div className="flex gap-3">
          <Skeleton className="h-9 w-64 rounded-md" />
          <Skeleton className="h-9 w-40 rounded-md" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </PageWrapper>
  );
}
