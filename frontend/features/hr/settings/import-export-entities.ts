import { Package, FileSpreadsheet } from "lucide-react";
import type { ImportEntity } from "@/components/import-export/entity-card";

export const HR_IMPORT_EXPORT_ENTITIES: ImportEntity[] = [
  {
    id: "expenses",
    label: "Expenses",
    icon: FileSpreadsheet,
    description:
      "Export expense claims with status, category, and amounts.",
    exportJob: {
      create: "/hr/expenses/export/jobs",
      status: (jobId: string) => `/hr/expenses/export/jobs/${jobId}`,
      download: (jobId: string) => `/hr/expenses/export/jobs/${jobId}/download`,
    },
    accent: "text-status-info-ink bg-status-info-surface",
    supported: { import: false, export: true },
  },
  {
    id: "assets",
    label: "Assets",
    icon: Package,
    description:
      "Export asset inventory with assigned employees and status.",
    exportEndpoint: "/hr/export/assets",
    accent: "text-muted-foreground bg-muted",
    supported: { import: false, export: true },
  },
];
