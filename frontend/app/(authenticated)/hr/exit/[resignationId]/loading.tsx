import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";

export default function ExitDetailLoading() {
  return (
    <PageWrapper
      title="Exit"
      subtitle="Offboarding checklist, owners and progress"
      backHref="/hr/exit"
      backLabel="Back to exit management"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <StatCardGridSkeleton count={4} />
        <div className={`${CONTENT_PANEL_SOLID} divide-y divide-border/60`}>
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-8 w-8 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
