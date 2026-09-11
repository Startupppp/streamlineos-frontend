export type BillingTab = "plan" | "payments" | "profile";

export const BILLING_TABS: readonly BillingTab[] = ["plan", "payments", "profile"];

// The route resolves the tab for its prefetch and the page resolves it for its render.
export function resolveBillingTab(raw: string | null | undefined): BillingTab {
  return BILLING_TABS.find((candidate) => candidate === raw) ?? "plan";
}
