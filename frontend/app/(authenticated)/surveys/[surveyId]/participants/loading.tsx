import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function SurveyParticipantsLoading() {
  return (
    <PageWrapper
      title="Participants"
      backHref="/surveys"
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
      actions={
        <div className="flex w-full items-center justify-end gap-2">
          <Skeleton className="h-9 w-40 shrink-0 rounded-md" />
          <Skeleton className="h-9 w-36 shrink-0 rounded-md" />
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
