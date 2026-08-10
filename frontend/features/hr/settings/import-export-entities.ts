import { Package, FileSpreadsheet } from "lucide-react";
import type { ImportEntity } from "@/features/shared/import-export/entity-card";

export const HR_IMPORT_EXPORT_ENTITIES: ImportEntity[] = [
  {
    id: "expenses",
    label: "Expenses",
    icon: FileSpreadsheet,
    description:
      "Export expense claims with status, category, and amounts.",
    exportEndpoint: "/hr/expenses/export",
    accent: "text-cyan-600 bg-cyan-500/10",
    supported: { import: false, export: true },
  },
  {
    id: "assets",
    label: "Assets",
    icon: Package,
    description:
      "Export asset inventory with assigned employees and status.",
    exportEndpoint: "/hr/export/assets",
    accent: "text-slate-600 bg-slate-500/10",
    supported: { import: false, export: true },
  },
];
