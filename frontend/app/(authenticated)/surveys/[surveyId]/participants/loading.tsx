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
      actionsInline
      extraActions={
        <div className="flex min-w-0 flex-nowrap items-center gap-2">
          <Skeleton className="h-9 w-36 shrink-0 rounded-md" />
          <Skeleton className="h-9 w-28 shrink-0 rounded-md sm:w-40" />
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
