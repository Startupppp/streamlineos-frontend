import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export function TaxesPageSkeleton() {
  return (
    <PageWrapper title="Tax & Statutory" eyebrow="Payroll">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-72 rounded" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </PageWrapper>
  );
}

export default function Loading() {
  return <TaxesPageSkeleton />;
}
