import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function BenefitsLoading() {
  return (
    <PageWrapper title="Benefits" subtitle="Manage employee benefit plans, enrollments, and insurance claims">
      <div className="space-y-4">
        <Skeleton className="h-9 w-64 rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
