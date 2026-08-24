import { LayoutDashboard, Users, Briefcase, Timer, IndianRupee, Handshake, ClipboardList, Package, LifeBuoy, Building2, Calculator, Library, PenTool } from "lucide-react";
import type { ComponentType } from "react";
import { matchesOrgModule } from "@/lib/module-vocabulary";
import type { ProductKey } from "./sidebar-nav-types";

export interface ProductDefinition {
  key: ProductKey;
  label: string;
  href: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
}

export const PRODUCT_DEFINITIONS: ProductDefinition[] = [
  { key: "home", label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { key: "crm", label: "CRM", href: "/crm", icon: Handshake },
  { key: "hrms", label: "HRMS", href: "/hr", icon: Users },
  { key: "build", label: "Build", href: "/build", icon: Briefcase },
  { key: "timesheets", label: "Timesheets", href: "/timesheets", icon: Timer },
  { key: "inventory", label: "Inventory", href: "/inventory", icon: Package },
  { key: "finance", label: "Finance", href: "/accounting", icon: Calculator },
  { key: "helpdesk", label: "Helpdesk", href: "/support", icon: LifeBuoy },
  {
    key: "documents",
    label: "Documents",
    href: "/knowledge/chat",
    icon: Library,
  },
  { key: "surveys", label: "Surveys", href: "/surveys", icon: ClipboardList },
  {
    key: "administration",
    label: "Administration",
    href: "/settings",
    icon: Building2,
  },
  {
    key: "payroll",
    label: "Payroll",
    href: "/payroll",
    icon: IndianRupee,
  },
  { key: "sign", label: "SignOS", href: "/sign", icon: PenTool },
];

export const PRODUCT_DESCRIPTIONS: Record<ProductKey, string> = {
  home: "Overview & activity",
  crm: "Leads, deals & contacts",
  hrms: "People & payroll",
  build: "Projects, issues & delivery",
  timesheets: "Track, approve & bill time",
  inventory: "Stock & orders",
  finance: "Accounts & books",
  helpdesk: "Tickets & support",
  documents: "Knowledge base",
  surveys: "Surveys & feedback",
  administration: "Settings & access",
  payroll: "Runs, payslips & compliance",
  sign: "Envelopes & e-signatures",
};

export interface ModuleAccent {
  text: string;
  bg: string;
  indicator: string;
  border: string;
}

export const MODULE_ACCENTS: Record<ProductKey, ModuleAccent> = {
  home: {
    text: "!text-slate-600 dark:!text-slate-400",
    bg: "bg-slate-100 dark:bg-slate-800/40",
    indicator: "bg-slate-500 dark:bg-slate-400",
    border: "border-slate-400 dark:border-slate-500",
  },
  crm: {
    text: "!text-blue-600 dark:!text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    indicator: "bg-blue-600 dark:bg-blue-500",
    border: "border-blue-600 dark:border-blue-500",
  },
  hrms: {
    text: "!text-emerald-600 dark:!text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    indicator: "bg-emerald-600 dark:bg-emerald-500",
    border: "border-emerald-600 dark:border-emerald-500",
  },
  build: {
    text: "!text-violet-600 dark:!text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    indicator: "bg-violet-600 dark:bg-violet-500",
    border: "border-violet-600 dark:border-violet-500",
  },
  timesheets: {
    text: "!text-indigo-600 dark:!text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    indicator: "bg-indigo-600 dark:bg-indigo-500",
    border: "border-indigo-600 dark:border-indigo-500",
  },
  inventory: {
    text: "!text-amber-600 dark:!text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    indicator: "bg-amber-600 dark:bg-amber-500",
    border: "border-amber-600 dark:border-amber-500",
  },
  finance: {
    text: "!text-cyan-700 dark:!text-cyan-400",
    bg: "bg-cyan-50 dark:bg-cyan-950/40",
    indicator: "bg-cyan-700 dark:bg-cyan-500",
    border: "border-cyan-700 dark:border-cyan-500",
  },
  helpdesk: {
    text: "!text-rose-600 dark:!text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    indicator: "bg-rose-600 dark:bg-rose-500",
    border: "border-rose-600 dark:border-rose-500",
  },
  documents: {
    text: "!text-slate-600 dark:!text-slate-400",
    bg: "bg-slate-100 dark:bg-slate-800/40",
    indicator: "bg-slate-500 dark:bg-slate-400",
    border: "border-slate-400 dark:border-slate-500",
  },
  surveys: {
    text: "!text-teal-600 dark:!text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-950/40",
    indicator: "bg-teal-600 dark:bg-teal-500",
    border: "border-teal-600 dark:border-teal-500",
  },
  administration: {
    text: "!text-slate-600 dark:!text-slate-400",
    bg: "bg-slate-100 dark:bg-slate-800/40",
    indicator: "bg-slate-500 dark:bg-slate-400",
    border: "border-slate-400 dark:border-slate-500",
  },
  payroll: {
    text: "!text-teal-600 dark:!text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-950/40",
    indicator: "bg-teal-600 dark:bg-teal-500",
    border: "border-teal-600 dark:border-teal-500",
  },
  sign: {
    text: "!text-sky-600 dark:!text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-950/40",
    indicator: "bg-sky-600 dark:bg-sky-500",
    border: "border-sky-600 dark:border-sky-500",
  },
};

const PRODUCT_MODULE_KEY: Partial<Record<ProductKey, string>> = {
  crm: "crm",
  hrms: "hr",
  build: "build",
  inventory: "inventory",
  finance: "accounting",
  helpdesk: "support",
  surveys: "surveys",
  payroll: "payroll",
  sign: "sign",
};

export function isModuleEnabled(
  key: ProductKey,
  enabledModules: string[],
): boolean {
  if (key === "home" || key === "administration") return true;
  if (enabledModules.length === 0) return false;
  const moduleKey = PRODUCT_MODULE_KEY[key];
  if (!moduleKey) return true;
  return matchesOrgModule(enabledModules, moduleKey);
}

