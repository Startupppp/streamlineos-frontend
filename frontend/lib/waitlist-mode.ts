export function isWaitlistMode(): boolean {
  return process.env.WAITLIST_MODE === "true";
}

export function isPublicWaitlistMode(): boolean {
  return process.env.NEXT_PUBLIC_WAITLIST_MODE === "true";
}

export function publicCtaHref(pathname?: string | null): string {
  if (!isPublicWaitlistMode()) return "/signin";
  return pathname === "/" ? "/#waitlist" : "/waitlist";
}

export function publicCtaLabel(fallback: string): string {
  return isPublicWaitlistMode() ? "Join the waitlist" : fallback;
}
