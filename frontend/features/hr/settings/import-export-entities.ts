import { Package, FileSpreadsheet } from "lucide-react";
import type { ImportEntity } from "@/components/import-export/entity-card";

export const HR_IMPORT_EXPORT_ENTITIES: ImportEntity[] = [
  {
    id: "expenses",
    label: "Expenses",
    icon: FileSpreadsheet,
    description:
      "Export expense claims with status, category, and amounts.",
    // Expenses exports run as a job. This card used to name
    // `GET /hr/expenses/export`, a route that has never existed — the backend
    // has `POST /hr/expenses/export/jobs` — so the browser answered
    // "Cannot GET /hr/expenses/export" and the card looked broken rather than
    // unavailable.
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
