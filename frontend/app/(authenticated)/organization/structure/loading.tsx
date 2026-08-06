import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrganizationStructureLoading() {
  return (
    <PageWrapper
      title="Organization Structure"
      subtitle="Set up reporting units once, then use them consistently across people, access, payroll, and reporting."
    >
      <div className="space-y-6">
        {[4, 2].map((count) => (
          <section key={count} className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-80 max-w-full" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: count }).map((_, index) => (
                <Skeleton key={index} className="h-40 w-full rounded-lg" />
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageWrapper>
  );
}
