import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function CrmCampaignsLoading() {
  return (
    <PageWrapper
      title="Campaigns"
      subtitle="Track lead sources and ROI"
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      }
    >
      <DataTableSkeleton rows={9} columns={9} />
    </PageWrapper>
  );
}
