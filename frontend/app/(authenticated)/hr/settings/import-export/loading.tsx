import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function ImportExportLoading() {
  return (
    <PageWrapper
      title="Import / Export"
      subtitle="Transfer HR data in bulk"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </PageWrapper>
  );
}
