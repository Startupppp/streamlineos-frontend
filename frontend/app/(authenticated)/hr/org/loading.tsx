import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrgHubLoading() {
  return (
    <PageWrapper
      title="Job Architecture"
      subtitle="Manage the job roles and levels used by HR records."
    >
      <div className="flex w-fit shrink-0 items-center gap-1 rounded-lg border p-1">
        {Array.from({ length: 2 }).map((_, skeletonIndex) => (
          <Skeleton key={skeletonIndex} className="h-7 w-24 rounded-md" />
        ))}
      </div>
      <DataTableSkeleton rows={10} headers={["Name", "Code", "Actions"]} />
    </PageWrapper>
  );
}
