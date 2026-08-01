import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function HrSetupLoading() {
  return (
    <PageWrapper
      title="HR Setup"
      subtitle="Complete your HR module configuration."
    >
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-72" />
              </div>
              <Skeleton className="h-8 w-24 rounded-md shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
