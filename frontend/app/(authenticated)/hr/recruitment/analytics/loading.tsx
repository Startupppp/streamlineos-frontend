import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function AnalyticsLoading() {
  return (
    <PageWrapper
      title="Recruitment Analytics"
      subtitle="Track hiring performance and pipeline health"
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <StatCardGridSkeleton cols={3} count={6} />
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => {
            const isWide = i === 2;
            return (
              <div
                key={i}
                className={`rounded-xl border border-border bg-card overflow-hidden${isWide ? " lg:col-span-2" : ""}`}
                style={{ height: isWide ? 248 : 268 }}
              />
            );
          })}
        </div>
      </div>
    </PageWrapper>
  );
}
