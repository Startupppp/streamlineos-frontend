import { format } from "date-fns";
import { fetchAllAssetsForExport } from "@/hooks/api/hr/assets";
import { getUserDisplayName } from "@/lib/person-display";
import type { EmployeeListItem } from "@/types/hr";

export interface ExportAssetFilters {
  statusFilter?: string;
  categoryFilter?: string;
  assignmentFilter?: string;
}

export async function exportAssetsToXlsx(
  employees: EmployeeListItem[],
  filters: ExportAssetFilters,
): Promise<{ count: number; filtered: boolean }> {
  const { downloadXlsx } = await import("@/lib/export/xlsx-utils");
  const { statusFilter, categoryFilter, assignmentFilter } = filters;
  const allAssets = await fetchAllAssetsForExport({ status: statusFilter });
  const exportItems = allAssets.filter((a) => {
    if (categoryFilter && a.type !== categoryFilter) return false;
    if (assignmentFilter === "assigned" && !a.assignedTo) return false;
    if (assignmentFilter === "unassigned" && a.assignedTo) return false;
    return true;
  });
  const exportRows = exportItems.map((a) => {
    const emp = employees.find((e) => e.id === a.assignedTo) ?? null;
    return {
      name: a.name,
      type: a.type,
      brand: a.brand ?? "",
      model: a.model ?? "",
      serialNumber: a.serialNumber ?? "",
      status: a.status ?? "AVAILABLE",
      assignedTo: emp ? getUserDisplayName(emp) : "",
      purchaseCost: a.purchaseCost ?? "",
      purchaseDate: a.purchaseDate ? format(new Date(a.purchaseDate), "yyyy-MM-dd") : "",
      location: a.location ?? "",
    };
  });
  const filterLabel = [
    statusFilter ? `status-${statusFilter.toLowerCase()}` : null,
    categoryFilter ? `type-${categoryFilter.toLowerCase()}` : null,
    assignmentFilter ?? null,
  ].filter(Boolean).join("_");
  const filename = filterLabel ? `assets-${filterLabel}.xlsx` : "assets-export.xlsx";
  await downloadXlsx(filename, [
    {
      name: "Assets",
      columns: [
        { header: "Asset Name", key: "name", width: 24 },
        { header: "Type", key: "type", width: 12 },
        { header: "Brand", key: "brand", width: 14 },
        { header: "Model", key: "model", width: 14 },
        { header: "Serial Number", key: "serialNumber", width: 20 },
        { header: "Status", key: "status", width: 12 },
        { header: "Assigned To", key: "assignedTo", width: 22 },
        { header: "Purchase Cost", key: "purchaseCost", width: 14 },
        { header: "Purchase Date", key: "purchaseDate", width: 14 },
        { header: "Location", key: "location", width: 18 },
      ],
      rows: exportRows,
    },
  ]);
  return {
    count: exportItems.length,
    filtered: Boolean(statusFilter ?? categoryFilter ?? assignmentFilter),
  };
}
