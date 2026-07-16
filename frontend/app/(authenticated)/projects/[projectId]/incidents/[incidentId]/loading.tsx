import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell, PmSection } from "@/features/projects/shared/pm-chrome";

export default function IncidentDetailLoading() {
  return (
    <PageWrapper title="Incident" backHref="#">
      <PmPageShell>
        <PmSection index={0}>
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </PmSection>
        <PmSection index={1}>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </div>
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
