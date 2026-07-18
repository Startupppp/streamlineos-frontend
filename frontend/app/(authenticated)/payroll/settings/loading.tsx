import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export function SettingsPageSkeleton() {
  return (
    <PageWrapper title="Payroll Settings" subtitle="Loading settings…">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-full max-w-md" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}

export default function Loading() {
  return <SettingsPageSkeleton />;
}
