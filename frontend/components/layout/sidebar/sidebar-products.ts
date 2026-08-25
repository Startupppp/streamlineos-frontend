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
    text: "!text-category-slate-ink",
    bg: "bg-muted",
    indicator: "bg-category-slate-fill",
    border: "border-border",
  },
  crm: {
    text: "!text-category-blue-ink",
    bg: "bg-status-info-surface",
    indicator: "bg-category-blue-fill",
    border: "border-status-info-rule",
  },
  hrms: {
    text: "!text-category-emerald-ink",
    bg: "bg-status-success-surface",
    indicator: "bg-category-emerald-fill",
    border: "border-status-success-rule",
  },
  build: {
    text: "!text-category-violet-ink",
    bg: "bg-category-violet-surface",
    indicator: "bg-category-violet-fill",
    border: "border-category-violet-rule",
  },
  timesheets: {
    text: "!text-category-violet-ink",
    bg: "bg-status-info-surface",
    indicator: "bg-category-violet-fill",
    border: "border-status-info-rule",
  },
  inventory: {
    text: "!text-category-amber-ink",
    bg: "bg-status-warning-surface",
    indicator: "bg-category-amber-fill",
    border: "border-status-warning-rule",
  },
  finance: {
    text: "!text-category-cyan-ink",
    bg: "bg-status-info-surface",
    indicator: "bg-category-cyan-fill",
    border: "border-status-info-rule",
  },
  helpdesk: {
    text: "!text-category-rose-ink",
    bg: "bg-status-danger-surface",
    indicator: "bg-category-rose-fill",
    border: "border-status-danger-rule",
  },
  documents: {
    text: "!text-category-slate-ink",
    bg: "bg-muted",
    indicator: "bg-category-slate-fill",
    border: "border-border",
  },
  surveys: {
    text: "!text-category-cyan-ink",
    bg: "bg-status-success-surface",
    indicator: "bg-category-cyan-fill",
    border: "border-status-success-rule",
  },
  administration: {
    text: "!text-category-slate-ink",
    bg: "bg-muted",
    indicator: "bg-category-slate-fill",
    border: "border-border",
  },
  payroll: {
    text: "!text-category-cyan-ink",
    bg: "bg-status-success-surface",
    indicator: "bg-category-cyan-fill",
    border: "border-status-success-rule",
  },
  sign: {
    text: "!text-category-blue-ink",
    bg: "bg-status-info-surface",
    indicator: "bg-category-blue-fill",
    border: "border-status-info-rule",
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

