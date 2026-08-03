import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function AutomationsLoading() {
  return (
    <PageWrapper
      title="Pipeline Automations"
      subtitle="Automate actions based on recruitment pipeline events"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
    >
      <div className="flex flex-1 min-h-0 flex-col gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-36 rounded-md" />
                  <Skeleton className="h-3 w-4" />
                  <Skeleton className="h-6 w-40 rounded-md" />
                </div>
                <Skeleton className="h-3 w-32" />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Skeleton className="h-8 w-16 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
