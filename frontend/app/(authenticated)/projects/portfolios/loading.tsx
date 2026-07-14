import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  PmPageShell,
  PM_PANEL,
  PM_TOOLBAR,
} from "@/features/projects/shared/pm-chrome";

export default function PortfoliosLoading() {
  return (
    <PageWrapper
      title="Portfolios"
      eyebrow="Projects"
      subtitle="Group related projects into portfolios"
      filters={
        <div className={PM_TOOLBAR}>
          <Skeleton className="h-8 w-40 rounded-md" />
          <Skeleton className="h-8 w-52 rounded-md" />
        </div>
      }
      actions={<Skeleton className="h-8 w-32 rounded-md" />}
    >
      <PmPageShell>
        <div className={cn(PM_PANEL, "space-y-2 p-3")}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border/40 py-2.5 last:border-0">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="ml-auto h-4 w-8" />
            </div>
          ))}
        </div>
      </PmPageShell>
    </PageWrapper>
  );
}
