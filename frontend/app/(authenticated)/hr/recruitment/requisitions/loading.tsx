import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function RequisitionsLoading() {
  return (
    <PageWrapper
      title="Job Requisitions"
      subtitle="Manage headcount requests and approvals"
      actions={<Skeleton className="h-9 w-[130px] rounded-md" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-md" />
          ))}
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    </PageWrapper>
  );
}
