import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

const MEMBER_HEADERS = ["Name", "Role", "Added", "Actions"] as const;

export function ProjectAccessSkeleton() {
  return <DataTableSkeleton rows={6} headers={MEMBER_HEADERS} mobileCards className="flex-1" />;
}
