import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function DevicesLoading() {
  return (
    <PageWrapper
      title="Time Clock Devices"
      subtitle="Manage biometric, RFID, and mobile time clock devices"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <div className="flex flex-col flex-1 min-h-0">
        {/* Tabs — 3 triggers: Devices, Failed Syncs, All Sync Logs */}
        <div className="flex items-center gap-1 h-9 rounded-md bg-muted p-1 w-fit mb-2">
          <Skeleton className="h-7 w-20 rounded-sm" />
          <Skeleton className="h-7 w-28 rounded-sm" />
          <Skeleton className="h-7 w-28 rounded-sm" />
        </div>

        {/* Devices tab content — DataTable with 6 columns */}
        <DataTableSkeleton rows={12} columns={6} />
      </div>
    </PageWrapper>
  );
}
