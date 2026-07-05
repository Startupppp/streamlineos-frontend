import { CreditCard } from "lucide-react";
import type { ImportEntity } from "@/features/shared/import-export/entity-card";

export const PAYROLL_IMPORT_EXPORT_ENTITIES: ImportEntity[] = [
  {
    id: "payroll",
    label: "Payroll Register",
    icon: CreditCard,
    description:
      "Export payroll records with breakdown, deductions, and net pay.",
    exportEndpoint: "/payroll/reports/register?format=csv",
    accent: "text-blue-600 bg-blue-500/10",
    supported: { import: false, export: true },
  },
];
