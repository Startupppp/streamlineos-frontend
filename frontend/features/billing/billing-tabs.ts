export type BillingTab = "plan" | "payments" | "profile";

export const BILLING_TABS: readonly BillingTab[] = ["plan", "payments", "profile"];

export function resolveBillingTab(raw: string | null | undefined): BillingTab {
  return BILLING_TABS.find((candidate) => candidate === raw) ?? "plan";
}
