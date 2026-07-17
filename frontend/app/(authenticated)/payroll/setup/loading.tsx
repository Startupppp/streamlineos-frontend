import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export function SetupPageSkeleton() {
  return (
    <PageWrapper title="Payroll Setup" subtitle="Configure your payroll in 5 steps." backHref="/payroll">
      <div className="max-w-2xl mx-auto py-4 space-y-4">
        <div className="flex items-center gap-2 justify-between">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-2.5 w-16 hidden sm:block" />
            </div>
          ))}
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-[400px] w-full rounded-xl border border-border" />
      </div>
    </PageWrapper>
  );
}

export default function Loading() {
  return <SetupPageSkeleton />;
}
