"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { gateCookieName } from "@/lib/onboarding-gate";


function hasCookie(name: string): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((pair) => pair.trim().startsWith(`${name}=`));
}

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
        Add bank details to receive salary — you skipped this earlier.
      </p>
      <Link
        href="/employee-onboarding"
        className="shrink-0 font-medium text-primary underline underline-offset-2"
      >
        Add now
      </Link>
    </div>
  );
}

export function MemberOnboardingNote() {
  const { data: session } = useSession();

  const isOwner = session?.user?.isOrgOwner === true;
  if (!session || isOwner) return null;

  return (
    <p className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-dense text-muted-foreground">
      Complete your employee profile so HR has your details.
      You can finish this now or come back to it any time.
    </p>
  );
}
