import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PmPageShell, PM_PANEL } from "@/features/projects/shared/pm-chrome";

export default function TemplatesLoading() {
  return (
    <PageWrapper
      title="Templates"
      eyebrow="Projects"
      subtitle="Reusable project structures to bootstrap new work"
      actions={<Skeleton className="h-8 w-32 rounded-md" />}
    >
      <PmPageShell>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className={cn(PM_PANEL, "space-y-3 p-4")}>
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          ))}
        </div>
      </PmPageShell>
    </PageWrapper>
  );
}
