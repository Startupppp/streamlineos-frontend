import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AnimatedLogo } from "@/features/landing/components/animated-logo";
import { BRAND_NAME } from "@/lib/branding";
import { getServerAuth } from "@/lib/get-server-auth";
import { signInPathForMissingSession } from "@/lib/auth-session-cookies";
import { OWNER_HOME } from "@/lib/platform/role";
import { ONBOARDING_COL_PAD_X } from "@/features/onboarding/lib/constants";
import { cn } from "@/lib/utils";

export default async function EmployeeOnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerAuth();

  if (!session?.user) redirect(signInPathForMissingSession());
  if (session.user.isPlatformAdmin) redirect(OWNER_HOME);
  if (!session.orgId) redirect("/org-setup");
  if (session.user.isOrgOwner) redirect("/dashboard");
  if (session.userOnboardingCompletedAt) redirect("/dashboard");

  return (
    <div className="relative flex h-[100dvh] max-w-[100vw] overflow-hidden surface-soft text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-white text-sm font-medium"
      >
        Skip to content
      </a>

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className={cn(
            "flex shrink-0 items-center pt-3 pb-0 md:hidden",
            ONBOARDING_COL_PAD_X,
          )}
        >
          <Link
            href="/"
            className="group flex min-h-11 items-center gap-2.5"
            aria-label={BRAND_NAME}
          >
            <AnimatedLogo size={30} className="rounded-xl" />
            <span className="font-display text-base font-bold tracking-tight text-foreground">
              {BRAND_NAME}
            </span>
          </Link>
        </header>

        <main
          id="main-content"
          aria-label="Employee onboarding"
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
