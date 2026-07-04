import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export function FnfPageSkeleton() {
  return (
    <PageWrapper title="Full & Final Settlement" eyebrow="Payroll">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </PageWrapper>
  );
}

export default function Loading() {
  return <FnfPageSkeleton />;
}
