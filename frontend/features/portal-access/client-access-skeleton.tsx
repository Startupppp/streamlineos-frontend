import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export function ClientAccessSkeleton() {
  return <DataTableSkeleton rows={12} columns={5} mobileCards className="flex-1" />;
}
