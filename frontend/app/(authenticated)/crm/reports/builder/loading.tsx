import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";

export default function CrmReportBuilderLoading() {
  return (
    <PageWrapper
      title="Report builder"
      subtitle="Ask the CRM a question and read the answer."
      backHref="/crm/reports"
      backLabel="Back to reports"
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <div className={cn(CONTENT_PANEL_SOLID, "flex flex-col gap-4 p-4 lg:w-96 lg:shrink-0")}>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <DataTableSkeleton rows={10} columns={4} />
        </div>
      </div>
    </PageWrapper>
  );
}
