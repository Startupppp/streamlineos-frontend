import { resolveOrgTimeZone } from "@/lib/date-utils";

export function trialDaysRemaining(trialEndsAt: string, now: number): number {
  return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - now) / 86_400_000));
}

export function formatTrialEndDate(trialEndsAt: string, orgTz: string | null): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: resolveOrgTimeZone(orgTz),
  }).format(new Date(trialEndsAt));
}

export function formatTrialDaysLeft(daysLeft: number): string {
  if (daysLeft === 0) return "ends today";
  return `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;
}
