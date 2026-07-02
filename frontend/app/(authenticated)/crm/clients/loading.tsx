import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SkeletonTable } from "@/components/shared";

export default function ClientsLoading() {
  return (
    <PageWrapper
      title="Clients"
      subtitle="Client accounts"
      filters={
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-64 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      }
    >
      <SkeletonTable rows={8} columns={8} />
    </PageWrapper>
  );
}
