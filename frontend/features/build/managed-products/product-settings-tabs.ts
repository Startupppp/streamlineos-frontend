export const PRODUCT_SETTINGS_TABS = [
  { id: "general", label: "General" },
  { id: "members", label: "Members" },
  { id: "releases", label: "Releases" },
] as const;

export type ProductSettingsTabId = (typeof PRODUCT_SETTINGS_TABS)[number]["id"];

const PRODUCT_SETTINGS_TAB_IDS: ReadonlySet<string> = new Set(
  PRODUCT_SETTINGS_TABS.map((tab) => tab.id),
);

export function productSettingsTabFromParam(
  value: string | null | undefined,
): ProductSettingsTabId {
  if (value && PRODUCT_SETTINGS_TAB_IDS.has(value)) return value as ProductSettingsTabId;
  return "general";
}
