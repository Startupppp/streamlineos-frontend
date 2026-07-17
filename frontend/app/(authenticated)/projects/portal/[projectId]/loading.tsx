import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { cn } from "@/lib/utils";
import { PmPageShell, PM_PANEL } from "@/features/projects/shared/pm-chrome";

export default function PortalProjectLoading() {
  return (
    <PageWrapper title="Project" backHref="/projects/portal">
      <PmPageShell>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <div className={cn(PM_PANEL, "space-y-2 p-2")}>
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={j} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </PmPageShell>
    </PageWrapper>
  );
}
