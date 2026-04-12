import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function ScorecardTemplatesLoading() {
  return (
    <PageWrapper title="Scorecard Templates" subtitle="Define evaluation criteria for each interview round">
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
      </div>
    </PageWrapper>
  );
}
