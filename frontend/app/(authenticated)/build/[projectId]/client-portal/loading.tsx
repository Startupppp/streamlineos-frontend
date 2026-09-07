import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell, PmSection, PM_PANEL } from "@/components/pm-chrome/pm-chrome";
import { cn } from "@/lib/utils";

export default function ClientPortalLoading() {
  return (
    <PageWrapper title="Client Portal" subtitle="Control what clients see in their portal">
      <PmPageShell>
        <PmSection index={0}>
          <Skeleton className="h-12 w-full rounded-xl" />
        </PmSection>
        <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
          <div className={cn(PM_PANEL, "space-y-2 p-3")}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
