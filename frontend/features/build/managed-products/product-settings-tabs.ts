export const PRODUCT_SETTINGS_TABS = [
  { id: "general", label: "General" },
  { id: "members", label: "Members" },
  { id: "publishing", label: "Publishing" },
] as const;

type ProductSettingsTabId = (typeof PRODUCT_SETTINGS_TABS)[number]["id"];

export function productSettingsTabFromParam(
  value: string | null | undefined,
): ProductSettingsTabId {
  return PRODUCT_SETTINGS_TABS.find((tab) => tab.id === value)?.id ?? "general";
}
