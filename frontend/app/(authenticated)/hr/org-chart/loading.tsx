import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function OrgChartLoading() {
  return (
    <PageWrapper
      title="Organization"
      subtitle="Visualize your organization's reporting structure"
      actions={<Skeleton className="h-9 w-24 rounded-md" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-48 rounded-md" />
          <Skeleton className="h-9 w-[110px] rounded-md" />
        </div>
      }
    >
      <div className="flex-1 space-y-4">
        <div className="flex flex-col items-center gap-6 py-8">
          <Skeleton className="h-24 w-48 rounded-xl" />
          <div className="flex gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-4">
                <Skeleton className="h-20 w-40 rounded-xl" />
                <div className="flex gap-4">
                  <Skeleton className="h-16 w-32 rounded-lg" />
                  <Skeleton className="h-16 w-32 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
