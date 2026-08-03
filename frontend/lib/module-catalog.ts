import { Globe, MessageSquareText } from "lucide-react";
import {
  MODULE_ACCENTS,
  PRODUCT_DEFINITIONS,
  PRODUCT_DESCRIPTIONS,
  type ProductDefinition,
  type ProductKey,
} from "@/components/layout/sidebar/sidebar-nav-items";

export interface ModuleCatalogEntry {
  label: string;
  description: string;
  icon: ProductDefinition["icon"];
  iconBg: string;
  iconText: string;
}

const MODULE_TO_PRODUCT: Record<string, ProductKey> = {
  hr: "hrms",
  crm: "crm",
  build: "build",
  timesheets: "timesheets",
  inventory: "inventory",
  accounting: "finance",
  support: "helpdesk",
  kb: "documents",
  surveys: "surveys",
  payroll: "payroll",
  sign: "sign",
};

const NEUTRAL_ACCENT = MODULE_ACCENTS.home;

const EXTRA_MODULES: Record<string, ModuleCatalogEntry> = {
  chat: {
    label: "Chat",
    description: "Team messaging",
    icon: MessageSquareText,
    iconBg: NEUTRAL_ACCENT.bg,
    iconText: NEUTRAL_ACCENT.text,
  },
};

export function getModuleCatalogEntry(moduleKey: string): ModuleCatalogEntry {
  const productKey = MODULE_TO_PRODUCT[moduleKey];
  if (productKey) {
    const definition = PRODUCT_DEFINITIONS.find(
      (product) => product.key === productKey,
    );
    if (definition) {
      const accent = MODULE_ACCENTS[productKey];
      return {
        label: definition.label,
        description: PRODUCT_DESCRIPTIONS[productKey],
        icon: definition.icon,
        iconBg: accent.bg,
        iconText: accent.text,
      };
    }
  }
  const extra = EXTRA_MODULES[moduleKey];
  if (extra) return extra;
  return {
    label: moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1),
    description: "",
    icon: Globe,
    iconBg: NEUTRAL_ACCENT.bg,
    iconText: NEUTRAL_ACCENT.text,
  };
}
