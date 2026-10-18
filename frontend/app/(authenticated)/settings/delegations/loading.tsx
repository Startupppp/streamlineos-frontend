import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DelegationSkeletons } from "@/features/settings/delegations/delegation-row";

export default function DelegationsLoading() {
  return (
    <PageWrapper
      title="Delegations"
      subtitle="Share specific permissions with teammates for a set period."
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
      actions={<Skeleton className="h-9 w-24 rounded-md" />}
      filtersClassName="flex-col items-stretch gap-2 overflow-visible md:flex-row md:items-center md:justify-between [&>[data-slot=search-input]]:flex-none [&>[data-slot=search-input]]:basis-auto"
      filters={
        <>
          <div className="flex h-9 w-full items-center gap-1 rounded-md border border-border bg-card px-1 md:w-[240px]">
            <Skeleton className="h-5 w-16 rounded-sm" />
            <Skeleton className="h-5 w-16 rounded-sm" />
          </div>
          <Skeleton className="h-9 w-full rounded-md md:max-w-xs" />
        </>
      }
    >
      <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
        <DelegationSkeletons count={5} />
      </div>
    </PageWrapper>
  );
}
