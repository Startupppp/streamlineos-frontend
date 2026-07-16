import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell } from "@/features/projects/shared/pm-chrome";

export default function EpicsLoading() {
  return (
    <PageWrapper title="Epics">
      <PmPageShell>
        <div className="space-y-4">
          <div className="mb-1 grid grid-cols-2 gap-2.5 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
          <div className="space-y-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
      </PmPageShell>
    </PageWrapper>
  );
}
