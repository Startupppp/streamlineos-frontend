import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { EffectiveAccessSkeleton } from "@/features/settings/simulate/simulate-page";

export default function SimulateLoading() {
  return (
    <PageWrapper
      title="Effective access"
      subtitle="What one person can actually do, where each right comes from, and when it ends."
      backHref="/settings/roles"
      noInternalScroll
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      contentClassName="flex min-h-0 flex-1 flex-col"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-full sm:w-[320px]" />
        </div>
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        <EffectiveAccessSkeleton />
      </div>
    </PageWrapper>
  );
}
