import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export function CompanyDocumentsSkeleton() {
  return <DataTableSkeleton columns={5} mobileCards fill />;
}
