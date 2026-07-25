import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function RecruitmentSettingsLoading() {
  return (
    <PageWrapper
      title="Settings"
      subtitle="Configure hiring flows, scorecards, communication templates, and reports for TalentOS."
    >
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, sectionIdx) => (
          <div key={sectionIdx}>
            <Skeleton className="h-3 w-32 mb-3" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: sectionIdx === 0 ? 5 : sectionIdx === 1 ? 2 : 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
