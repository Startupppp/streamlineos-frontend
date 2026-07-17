import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrgChartLoading() {
  return (
    <PageWrapper
      title="Organization"
      subtitle="Visualize your organization's reporting structure"
      actions={<Skeleton className="h-9 w-24 rounded-md" />}
      filters={
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-48 rounded-md" />
          <Skeleton className="h-9 w-[110px] rounded-md" />
        </div>
      }
    >
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-2xl" />
        ))}
      </div>
    </PageWrapper>
  );
}
