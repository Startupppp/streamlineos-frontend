import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function TrainingLoading() {
  return (
    <PageWrapper
      title="Training Programs"
      subtitle="Manage sessions, track attendance and feedback"
      actions={<Skeleton className="h-9 w-[120px] rounded-md" />}
    >
      <div className="space-y-4">
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-2xl border border-border bg-card" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
