import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export function TaxesPageSkeleton() {
  return (
    <PageWrapper title="Tax & Statutory" subtitle="Manage declaration windows and employee tax declarations.">
      <div className="flex flex-col gap-4">
        <div className="flex gap-1 border-b border-border pb-0">
          <Skeleton className="h-9 w-36 rounded-t-md" />
          <Skeleton className="h-9 w-28 rounded-t-md" />
          <Skeleton className="h-9 w-24 rounded-t-md" />
          <Skeleton className="h-9 w-28 rounded-t-md" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </PageWrapper>
  );
}

export default function Loading() {
  return <TaxesPageSkeleton />;
}
