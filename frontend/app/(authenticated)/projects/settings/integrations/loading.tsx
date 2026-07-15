import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PmPageShell, PM_PANEL } from "@/features/projects/shared/pm-chrome";

export default function IntegrationsLoading() {
  return (
    <PageWrapper
      title="Integrations"
      subtitle="Connect Git repositories to link commits and pull requests to tickets"
      actions={<Skeleton className="h-8 w-36 rounded-md" />}
    >
      <PmPageShell>
        <div className="space-y-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className={cn(PM_PANEL, "space-y-3 p-4")}>
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-64" />
                </div>
              </div>
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          ))}
        </div>
      </PmPageShell>
    </PageWrapper>
  );
}
