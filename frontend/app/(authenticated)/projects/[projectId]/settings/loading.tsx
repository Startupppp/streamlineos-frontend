import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell, PmPanel, PmSection } from "@/features/projects/shared/pm-chrome";

export default function ProjectSettingsLoading() {
  return (
    <PageWrapper title="Settings">
      <PmPageShell>
        <div className="flex flex-col gap-4 pb-8 md:flex-row">
          <PmSection index={0} className="w-full shrink-0 md:w-48">
            <PmPanel className="p-1.5">
              <div className="flex w-full gap-0.5 overflow-x-auto md:flex-col md:overflow-visible">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-20 shrink-0 rounded-md md:w-full" />
                ))}
              </div>
            </PmPanel>
          </PmSection>
          <PmSection index={1} className="min-w-0 flex-1">
            <PmPanel className="p-4" solid>
              <div className="space-y-4">
                <Skeleton className="h-9 w-full rounded-md" />
                <Skeleton className="h-20 w-full rounded-md" />
                <Skeleton className="h-9 w-full rounded-md" />
                <Skeleton className="h-9 w-40 rounded-md" />
              </div>
            </PmPanel>
          </PmSection>
        </div>
      </PmPageShell>
    </PageWrapper>
  );
}
