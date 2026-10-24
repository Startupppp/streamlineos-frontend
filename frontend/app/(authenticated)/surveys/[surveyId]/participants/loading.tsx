import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function SurveyParticipantsLoading() {
  return (
    <PageWrapper
      title="Participants"
      subtitle="Invite people and track who has started or finished."
      backHref="/surveys"
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
      extraActions={
        <div className="grid w-full min-w-0 grid-cols-2 items-center gap-2 sm:flex sm:w-auto sm:flex-nowrap">
          <Skeleton className="h-9 w-full rounded-md sm:w-36 sm:shrink-0" />
          <Skeleton className="h-9 w-full rounded-md sm:w-40 sm:shrink-0" />
        </div>
      }
    >
      <DataTableSkeleton
        rows={8}
        headers={["Name", "Email", "Status", "Invited", "Completed"]}
        fill
      />
    </PageWrapper>
  );
}
