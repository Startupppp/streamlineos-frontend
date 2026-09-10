import { Globe, MessageSquareText } from "lucide-react";
import {
  MODULE_ACCENTS,
  PRODUCT_DEFINITIONS,
  PRODUCT_DESCRIPTIONS,
  type ProductDefinition,
} from "@/components/layout/sidebar/sidebar-nav-items";
import { moduleById } from "@/lib/module-manifest";

export interface ModuleCatalogEntry {
  label: string;
  description: string;
  icon: ProductDefinition["icon"];
  iconBg: string;
  iconText: string;
}

const NEUTRAL_ACCENT = MODULE_ACCENTS.home;

// The manifest is JSON, so it cannot carry an icon component for a module with no product.
const ICON_WITHOUT_PRODUCT: Record<string, ProductDefinition["icon"]> = {
  chat: MessageSquareText,
};

export function getModuleCatalogEntry(moduleKey: string): ModuleCatalogEntry {
  const manifestEntry = moduleById(moduleKey);
  const productKey = manifestEntry?.productKey ?? null;

  if (productKey !== null) {
    const definition = PRODUCT_DEFINITIONS.find(
      (product) => product.key === productKey,
    );
    if (definition) {
      const accent = MODULE_ACCENTS[definition.key];
      return {
        label: manifestEntry?.displayName ?? definition.label,
        description: PRODUCT_DESCRIPTIONS[definition.key],
        icon: definition.icon,
        iconBg: accent.bg,
        iconText: accent.text,
      };
    }
  }

  return {
    label:
      manifestEntry?.displayName ??
      (moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1)),
    description: "",
    icon: ICON_WITHOUT_PRODUCT[moduleKey] ?? Globe,
    iconBg: NEUTRAL_ACCENT.bg,
    iconText: NEUTRAL_ACCENT.text,
  };
}
