import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function KbResearchBriefsLoading() {
  return (
    <PageWrapper
      title="Research Briefs"
      subtitle="AI-synthesized reports from your knowledge base"
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <Skeleton className="h-9 w-full rounded-md" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-32 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </div>

        <div className="space-y-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <Skeleton className="h-4 flex-1 max-w-[70%]" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
