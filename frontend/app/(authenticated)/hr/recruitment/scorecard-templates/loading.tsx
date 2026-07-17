import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function ScorecardTemplatesLoading() {
  return (
    <PageWrapper
      title="Scorecard Templates"
      subtitle="Define evaluation criteria for each interview round"
      actions={<Skeleton className="h-9 w-[120px] rounded-md" />}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-xl" />
        ))}
      </div>
    </PageWrapper>
  );
}
