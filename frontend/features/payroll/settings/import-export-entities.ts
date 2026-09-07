import { CreditCard } from "lucide-react";
import type { ImportEntity } from "@/components/import-export/entity-card";

export const PAYROLL_IMPORT_EXPORT_ENTITIES: ImportEntity[] = [
  {
    id: "payroll",
    label: "Payroll Register",
    icon: CreditCard,
    description:
      "Export payroll records with breakdown, deductions, and net pay.",
    exportEndpoint: "/payroll/reports/register?format=csv",
    accent: "text-status-info-ink bg-status-info-surface",
    supported: { import: false, export: true },
  },
];
