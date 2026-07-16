import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function TrainingLoading() {
  return (
    <PageWrapper
      title="Training Programs"
      subtitle="Manage sessions, track attendance and feedback"
      actions={<Skeleton className="h-9 w-[120px] rounded-md" />}
    >
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
