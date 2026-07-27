import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { PmPageShell, PmPanel, PmSection } from "@/features/build/shared/pm-chrome";

export default function TeamDetailLoading() {
  return (
    <PageWrapper title="Team" backHref="/build/teams">
      <PmPageShell>
        <PmSection index={0}>
          <PmPanel className="flex flex-wrap items-center gap-3 p-4">
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-4 w-20 rounded" />
          </PmPanel>
        </PmSection>
        <PmSection index={1} className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24 rounded" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-40 rounded-md" />
              <Skeleton className="h-8 w-24 rounded-md" />
              <Skeleton className="h-8 w-16 rounded-md" />
            </div>
          </div>
          <PmPanel className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Skeleton className="h-3.5 w-32 rounded" />
                  <Skeleton className="h-3 w-48 rounded" />
                </div>
                <Skeleton className="h-8 w-24 rounded-md shrink-0" />
                <Skeleton className="h-7 w-7 rounded shrink-0" />
              </div>
            ))}
          </PmPanel>
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
