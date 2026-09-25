"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { gateCookieName, mayDeferOwnOnboarding } from "@/lib/onboarding-gate";

/**
 * V-034. Two things the deferral gate left unsaid.
 *
 * (a) An administrator who pressed "Skip for now" was never reminded again:
 *     their own record stays incomplete and nothing in `/hr` said so.
 * (b) A MEMBER redirected into the wizard was told nothing about why they had
 *     landed there — `AdminDeferBanner` renders nothing for them, by design,
 *     because they may not defer.
 *
 * Both read the session rather than a role string of their own, so they can
 * never disagree with `resolveWizardGate` about who is which (FE-52).
 */

function hasCookie(name: string): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((pair) => pair.trim().startsWith(`${name}=`));
}

/**
 * Shown in the `/hr` shell to an administrator who deferred: their onboarding
 * is still incomplete, and this is the only thing that says so.
 *
 * The cookie is an external store with a server snapshot of `false`: the
 * server has no `document`, and reading it during render would make the
 * banner a hydration mismatch.
 */
const NO_SUBSCRIBE = () => () => {};

export function DeferredOnboardingReminder() {
  const { data: session } = useSession();

  const userId = session?.user?.id;
  const orgId = session?.orgId;
  const incomplete = !session?.userOnboardingCompletedAt;
  const cookieName =
    incomplete && userId && orgId
      ? gateCookieName("onboarding-deferred", `${userId}--${orgId}`)
      : "";

  const deferred = useSyncExternalStore(
    NO_SUBSCRIBE,
    () => cookieName !== "" && hasCookie(cookieName),
    () => false,
  );

  if (!deferred) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
      <p className="text-dense text-muted-foreground">
        Your own employee profile is still incomplete — you skipped it earlier.
      </p>
      <Link
        href="/employee-onboarding"
        className="shrink-0 font-medium text-primary underline underline-offset-2"
      >
        Finish your details
      </Link>
    </div>
  );
}

/**
 * Shown in the wizard beside `AdminDeferBanner`, to the people that banner
 * deliberately renders nothing for: they were redirected here and, unlike an
 * administrator, they cannot leave until this is done.
 */
export function MemberOnboardingNote() {
  const { data: session } = useSession();

  if (!session || mayDeferOwnOnboarding(session)) return null;

  return (
    <p className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-dense text-muted-foreground">
      Your organisation asks every employee to complete this profile before
      using HR, which is why you were brought here. Finish these steps and
      you will land back where you were going.
    </p>
  );
}
