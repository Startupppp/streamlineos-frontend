export type PrivacyTab = "member" | "requests";

export const PRIVACY_TABS: readonly PrivacyTab[] = ["member", "requests"];

export function resolvePrivacyTab(
  raw: string | null | undefined,
  available: readonly PrivacyTab[],
): PrivacyTab {
  if (raw && available.includes(raw as PrivacyTab)) return raw as PrivacyTab;
  return available[0] ?? "member";
}
