import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  PmPageShell,
  PmPanel,
  PmSection,
} from "@/features/projects/shared/pm-chrome";
import { PAGE_CHROME_X } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";

export default function AllWorkLoading() {
  return (
    <PageWrapper
      title="All Work"
      subtitle="All tickets across every project"
      noInternalScroll
      contentClassName="!p-0"
    >
      <PmPageShell className="min-h-0 flex-1 gap-0 overflow-hidden" withGlow>
        <PmSection
          index={0}
          className={cn(
            PAGE_CHROME_X,
            "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden pt-2",
          )}
        >
          <div className="flex min-h-0 flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-9 w-[110px] rounded-md" />
                <Skeleton className="h-9 w-9 rounded-md" />
                <Skeleton className="h-9 w-9 rounded-md" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-32 rounded-md" />
                <Skeleton className="h-9 w-32 rounded-md" />
                <Skeleton className="h-9 w-28 rounded-md" />
              </div>
            </div>
          </div>
          <PmPanel solid className="mb-2 mt-2 flex-1 overflow-auto">
            <div className="space-y-2 py-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-md" />
              ))}
            </div>
          </PmPanel>
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
