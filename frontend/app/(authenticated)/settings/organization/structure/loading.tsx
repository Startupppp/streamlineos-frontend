import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

function StructureRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg px-2.5 py-2">
      <Skeleton className="size-8 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-6" />
        </div>
        <Skeleton className="h-3 w-56" />
      </div>
    </div>
  );
}

function HealthRowSkeleton() {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <Skeleton className="size-4 shrink-0 rounded-full" />
      <Skeleton className="h-3 min-w-0 flex-1" />
      <Skeleton className="h-4 w-6" />
    </div>
  );
}

export default function OrganizationStructureLoading() {
  return (
    <PageWrapper
      title="Organization Structure"
      subtitle="Set up reporting units once, then reuse them across people, access, payroll, and reporting."
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-20" />
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
          <section className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-4 py-3 space-y-1">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="divide-y divide-border/60 p-1.5">
              <StructureRowSkeleton />
              <StructureRowSkeleton />
              <StructureRowSkeleton />
              <StructureRowSkeleton />
            </div>
          </section>

          <div className="flex flex-col gap-4">
            <section className="rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-4 py-3 space-y-1">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-44" />
              </div>
              <div className="divide-y divide-border/60 p-1.5">
                <StructureRowSkeleton />
                <StructureRowSkeleton />
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-5 w-16" />
              </div>
              <div className="space-y-0.5">
                <HealthRowSkeleton />
                <HealthRowSkeleton />
                <HealthRowSkeleton />
                <HealthRowSkeleton />
              </div>
            </section>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
