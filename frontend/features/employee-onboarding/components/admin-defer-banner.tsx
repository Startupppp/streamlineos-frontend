"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { writeGateCookie } from "@/lib/onboarding-gate";

/**
 * HRMS-E2E-020. An ORG_ADMIN brought in to set up HR was redirected to this
 * wizard and every `/hr` URL kept redirecting back to it, so they had to hand
 * over their own date of birth, bank account and PAN before they could open the
 * module they were hired to configure. There was no skip.
 *
 * Decision #7's recommended default is that an administrator may defer while a
 * member stays guided. PROVISIONAL until Joseph confirms.
 *
 * Deferring is not finishing. This writes `onboarding-deferred`, which is a
 * different cookie from the `onboarding-done` the review step writes:
 * `userOnboardingCompletedAt` stays null, the wizard stays reachable from the
 * banner's own copy, and nothing downstream is told bank details exist that do
 * not. `resolveWizardGate` checks the standing as well as the cookie, so this is
 * not a marker a member could mint for themselves.
 */
export function AdminDeferBanner() {
  const { data: session } = useSession();
  const router = useRouter();

  const userId = session?.user?.id;
  const orgId = session?.orgId;
  const isAdmin = session?.user?.role === "ORG_ADMIN";

  const handleDefer = useCallback(() => {
    if (!userId || !orgId) return;
    writeGateCookie("onboarding-deferred", `${userId}--${orgId}`);
    router.push("/hr");
  }, [orgId, router, userId]);

  if (!isAdmin || !userId || !orgId) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
      <p className="text-dense text-muted-foreground">
        You are an administrator. You can set up HR first and fill in your own
        details whenever you like — this page stays available.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={handleDefer}
      >
        Skip for now
      </Button>
    </div>
  );
}
