import { PageState } from "@/components/shared/page-state";
import {
  CONTENT_FILL_PANEL,
  PM_FILL_SECTION,
  PmPageShell,
  PmSection,
} from "@/components/pm-chrome";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  AllWorkSkeleton,
  AllWorkToolbarSkeleton,
} from "@/features/build/all-work/all-work-view-switcher";
import { cn } from "@/lib/utils";

export default function AllWorkLoading() {
  return (
    <PageWrapper
      title="All Work"
      subtitle="Explore tickets across every project you can access"
      noInternalScroll
      filters={<AllWorkToolbarSkeleton />}
      filtersClassName="flex-col items-stretch gap-0 overflow-visible pb-2 [&>*]:w-full [&>*]:min-w-0 [&>*]:shrink"
    >
      <PmPageShell>
        <PmSection index={0} className={cn(PM_FILL_SECTION, "gap-0")}>
          <PageState
            resolution={{ kind: "loading" }}
            className={CONTENT_FILL_PANEL}
            loading={<AllWorkSkeleton view="list" />}
          >
            {null}
          </PageState>
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
