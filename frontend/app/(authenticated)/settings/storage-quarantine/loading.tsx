import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function StorageQuarantineLoading() {
  return (
    <PageWrapper
      title="Upload quarantine"
      subtitle="Files held back until a malware scan clears them."
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
      filters={<Skeleton className="h-9 w-44" />}
    >
      <DataTableSkeleton
        fill
        headers={["File", "Status", "Size", "Uploaded by", "Uploaded", ""]}
      />
    </PageWrapper>
  );
}
