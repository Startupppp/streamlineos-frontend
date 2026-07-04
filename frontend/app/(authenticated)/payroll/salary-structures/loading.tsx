import { PageWrapper } from "@/components/ui/page-wrapper";

export function SalaryStructuresSkeleton() {
  return (
    <PageWrapper title="Salary Structure Templates" subtitle="Loading…">
      <div className="h-9 w-64 bg-muted animate-pulse rounded-lg mb-2" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 bg-muted animate-pulse rounded-xl border border-border" />
        ))}
      </div>
    </PageWrapper>
  );
}

export default function Loading() {
  return <SalaryStructuresSkeleton />;
}
