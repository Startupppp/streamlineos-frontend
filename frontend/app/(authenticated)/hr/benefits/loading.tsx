import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function BenefitsLoading() {
  return (
    <PageWrapper
      title="Benefits"
      subtitle="Manage employee benefit plans, enrollments, and insurance claims"
    >
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        <Skeleton className="h-9 w-64 rounded-md" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
