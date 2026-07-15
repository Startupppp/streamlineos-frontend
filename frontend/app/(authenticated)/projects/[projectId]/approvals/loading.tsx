import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { PM_PANEL, PM_TOOLBAR } from "@/features/projects/shared/pm-chrome";
import { cn } from "@/lib/utils";

export default function ProjectApprovalsLoading() {
  return (
    <PageWrapper
      title="Approvals"
      subtitle="Review and manage approval requests for this project"
      actions={<Skeleton className="h-8 w-36 rounded-md" />}
      filters={
        <div className={cn(PM_TOOLBAR, "w-full")}>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-40 rounded-md" />
            <Skeleton className="h-8 w-40 rounded-md" />
          </div>
        </div>
      }
    >
      <div className={cn("space-y-2 p-2", PM_PANEL)}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex h-10 items-center gap-3 border-b border-border/50 px-2 last:border-0">
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-3 max-w-[16rem] flex-1" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
