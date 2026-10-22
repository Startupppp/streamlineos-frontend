import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { WIP_TABLE_HEADERS, TRANSITION_TABLE_HEADERS } from "./workflow-table-headers";

export function WorkflowSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <DataTableSkeleton rows={12} headers={WIP_TABLE_HEADERS} mobileCards className="flex-1" />
      <DataTableSkeleton rows={12} headers={TRANSITION_TABLE_HEADERS} mobileCards className="flex-1" />
    </div>
  );
}
