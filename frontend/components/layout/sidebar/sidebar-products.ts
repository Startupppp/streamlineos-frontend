import { LayoutDashboard, Users, Briefcase, Timer, IndianRupee, Handshake, ClipboardList, Package, LifeBuoy, Building2, Calculator, Library, PenTool } from "lucide-react";
import type { ComponentType } from "react";
import { matchesOrgModule } from "@/lib/module-vocabulary";
import { MANIFEST, moduleByProductKey } from "@/lib/module-manifest";
import type { ProductKey } from "./sidebar-nav-types";

export interface ProductDefinition {
  key: ProductKey;
  label: string;
  href: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
}

// Products whose href intentionally differs from the manifest route.
// - administration: no manifest module; chrome product pointing at /settings
// - documents: manifest route is /knowledge; the sidebar entry lands at /knowledge/chat
export const PRODUCT_HREF_EXCEPTIONS: Readonly<Partial<Record<ProductKey, string>>> = {
  administration: "/settings",
  documents: "/knowledge/chat",
};

// Products with no manifest module counterpart (not in any module's productKey set).
export const PRODUCT_KEY_EXCEPTIONS = new Set<ProductKey>(["administration"]);

function resolveProductHref(key: ProductKey): string {
  const exception = PRODUCT_HREF_EXCEPTIONS[key];
  if (exception !== undefined) return exception;
  const product = moduleByProductKey(key);
  return product?.route ?? `/${key}`;
}

// Verify at module load time that the manifest productKey set and the
// PRODUCT_DEFINITIONS key set agree (minus the named exceptions above).
// Failures surface as console warnings rather than crashes so that a stale
// vendor copy degrades gracefully in development.
const manifestProductKeys = new Set(
  MANIFEST.modules
    .filter((m) => m.productKey !== null)
    .map((m) => m.productKey as string),
);

export const PRODUCT_DEFINITIONS: ProductDefinition[] = [
  { key: "home", label: "Home", href: resolveProductHref("home"), icon: LayoutDashboard },
  { key: "crm", label: "CRM", href: resolveProductHref("crm"), icon: Handshake },
  { key: "hrms", label: "HRMS", href: resolveProductHref("hrms"), icon: Users },
  { key: "build", label: "Build", href: resolveProductHref("build"), icon: Briefcase },
  { key: "timesheets", label: "Timesheets", href: resolveProductHref("timesheets"), icon: Timer },
  { key: "inventory", label: "Inventory", href: resolveProductHref("inventory"), icon: Package },
  { key: "finance", label: "Finance", href: resolveProductHref("finance"), icon: Calculator },
  { key: "helpdesk", label: "Helpdesk", href: resolveProductHref("helpdesk"), icon: LifeBuoy },
  { key: "documents", label: "Documents", href: resolveProductHref("documents"), icon: Library },
  { key: "surveys", label: "Surveys", href: resolveProductHref("surveys"), icon: ClipboardList },
  { key: "administration", label: "Administration", href: resolveProductHref("administration"), icon: Building2 },
  { key: "payroll", label: "Payroll", href: resolveProductHref("payroll"), icon: IndianRupee },
  { key: "sign", label: "SignOS", href: resolveProductHref("sign"), icon: PenTool },
];

if (process.env.NODE_ENV !== "production") {
  for (const definition of PRODUCT_DEFINITIONS) {
    if (
      !PRODUCT_KEY_EXCEPTIONS.has(definition.key) &&
      !manifestProductKeys.has(definition.key)
    ) {
      console.warn(
        `[sidebar-products] product key "${definition.key}" is not in the manifest productKey set and not in PRODUCT_KEY_EXCEPTIONS`,
      );
    }
  }
}

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
    bg: "bg-category-blue-surface",
    indicator: "bg-category-blue-fill",
    border: "border-category-blue-rule",
  },
  hrms: {
    text: "!text-category-emerald-ink",
    bg: "bg-category-emerald-surface",
    indicator: "bg-category-emerald-fill",
    border: "border-category-emerald-rule",
  },
  build: {
    text: "!text-category-violet-ink",
    bg: "bg-category-violet-surface",
    indicator: "bg-category-violet-fill",
    border: "border-category-violet-rule",
  },
  timesheets: {
    text: "!text-category-indigo-ink",
    bg: "bg-category-indigo-surface",
    indicator: "bg-category-indigo-fill",
    border: "border-category-indigo-rule",
  },
  inventory: {
    text: "!text-category-amber-ink",
    bg: "bg-category-amber-surface",
    indicator: "bg-category-amber-fill",
    border: "border-category-amber-rule",
  },
  finance: {
    text: "!text-category-cyan-ink",
    bg: "bg-category-cyan-surface",
    indicator: "bg-category-cyan-fill",
    border: "border-category-cyan-rule",
  },
  helpdesk: {
    text: "!text-category-rose-ink",
    bg: "bg-category-rose-surface",
    indicator: "bg-category-rose-fill",
    border: "border-category-rose-rule",
  },
  documents: {
    text: "!text-category-slate-ink",
    bg: "bg-muted",
    indicator: "bg-category-slate-fill",
    border: "border-border",
  },
  surveys: {
    text: "!text-category-teal-ink",
    bg: "bg-category-teal-surface",
    indicator: "bg-category-teal-fill",
    border: "border-category-teal-rule",
  },
  administration: {
    text: "!text-category-slate-ink",
    bg: "bg-muted",
    indicator: "bg-category-slate-fill",
    border: "border-border",
  },
  payroll: {
    text: "!text-category-green-ink",
    bg: "bg-category-green-surface",
    indicator: "bg-category-green-fill",
    border: "border-category-green-rule",
  },
  sign: {
    text: "!text-category-sky-ink",
    bg: "bg-category-sky-surface",
    indicator: "bg-category-sky-fill",
    border: "border-category-sky-rule",
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
