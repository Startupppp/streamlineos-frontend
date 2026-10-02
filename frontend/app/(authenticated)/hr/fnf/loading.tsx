import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function FnfLoading() {
  return (
    <PageWrapper
      title="Full and final draft"
      subtitle="Record what a separated employee is owed. Payroll runs the settlement itself — this page saves a draft and does not pay anything."
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
    >
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    </PageWrapper>
  );
}
