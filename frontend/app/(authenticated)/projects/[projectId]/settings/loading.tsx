import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell } from "@/features/projects/shared/pm-chrome";

export default function ProjectSettingsLoading() {
  return (
    <PageWrapper title="Settings">
      <PmPageShell>
        <div className="flex flex-col gap-4 pb-8 md:flex-row">
          <div className="flex shrink-0 gap-0.5 border-b border-border pb-2 md:w-48 md:flex-col md:border-b-0 md:border-r md:pb-0 md:pr-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-md md:w-full" />
            ))}
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-24 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
      </PmPageShell>
    </PageWrapper>
  );
}
