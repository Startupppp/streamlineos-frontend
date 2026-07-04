import {
  Users,
  Handshake,
  Contact2,
  Building2,
  CreditCard,
  Package,
  FileSpreadsheet,
} from "lucide-react";
import type { ImportEntity } from "./entity-card";
import type { ProductKey } from "@/components/layout/sidebar/sidebar-nav-items";

export interface ModuleGroup {
  moduleKey: ProductKey;
  tabId: string;
  label: string;
  entities: ImportEntity[];
}

export const MODULE_GROUPS: ModuleGroup[] = [
  {
    moduleKey: "crm",
    tabId: "crm",
    label: "CRM",
    entities: [
      {
        id: "leads",
        label: "Leads",
        icon: Contact2,
        description:
          "Import leads from CSV/XLSX. Auto-detect columns, assign to reps.",
        templateUrl: "/templates/leads-template.xlsx",
        importEndpoint: "/leads/import",
        exportEndpoint: "/leads/export",
        accent: "text-blue-600 bg-blue-500/10",
        supported: { import: true, export: true },
      },
      {
        id: "contacts",
        label: "Contacts",
        icon: Users,
        description:
          "Bulk import CRM contacts with phone, email, and organization.",
        importEndpoint: "/contacts/import",
        exportEndpoint: "/contacts/export",
        accent: "text-emerald-600 bg-emerald-500/10",
        supported: { import: false, export: true },
      },
      {
        id: "deals",
        label: "Deals",
        icon: Handshake,
        description:
          "Export deal pipeline with stage, value, probability, close dates.",
        exportEndpoint: "/deals/export",
        accent: "text-amber-600 bg-amber-500/10",
        supported: { import: false, export: true },
      },
      {
        id: "clients",
        label: "Clients",
        icon: Building2,
        description:
          "Export client accounts with health score and activity data.",
        exportEndpoint: "/clients/export",
        accent: "text-rose-600 bg-rose-500/10",
        supported: { import: false, export: true },
      },
    ],
  },
  {
    moduleKey: "hrms",
    tabId: "hr",
    label: "HR",
    entities: [
      {
        id: "employees",
        label: "Employees",
        icon: Users,
        description:
          "Export employee directory with roles, departments, and contact info.",
        exportEndpoint: "/hr/employees/export",
        accent: "text-violet-600 bg-violet-500/10",
        supported: { import: false, export: true },
      },
      {
        id: "payroll",
        label: "Payroll",
        icon: CreditCard,
        description:
          "Export payroll records with breakdown, deductions, and net pay.",
        exportEndpoint: "/payroll/reports/register?format=csv",
        accent: "text-blue-600 bg-blue-500/10",
        supported: { import: false, export: true },
      },
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
        exportEndpoint: "/hr/assets/export",
        accent: "text-slate-600 bg-slate-500/10",
        supported: { import: false, export: true },
      },
    ],
  },
];

export const VALID_TAB_IDS = MODULE_GROUPS.map((g) => g.tabId);
