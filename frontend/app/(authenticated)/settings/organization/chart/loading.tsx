import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrganizationChartLoading() {
  return (
    <PageWrapper
      title="Organization Chart"
      subtitle="See how business units, branches, departments, and teams connect."
      filters={<Skeleton className="h-9 w-full max-w-[320px]" />}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-auto rounded-lg border border-border bg-card shadow-sm">
          <div className="p-4 space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-8 rounded-md"
                style={{ marginLeft: `${(i % 3) * 20}px` }}
              />
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
