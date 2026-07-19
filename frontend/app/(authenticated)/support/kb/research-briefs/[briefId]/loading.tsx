import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function KbResearchBriefDetailLoading() {
  return (
    <PageWrapper
      title="Research Brief"
      subtitle="AI-synthesized report"
      backHref="/support/kb/research-briefs"
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0 space-y-1.5">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3.5 w-40" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full shrink-0" />
          </div>
          <Skeleton className="h-3 w-32" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-32 rounded-full" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <Skeleton className="h-3 w-12" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-7 w-12 rounded-md" />
            <Skeleton className="h-7 w-10 rounded-md" />
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
