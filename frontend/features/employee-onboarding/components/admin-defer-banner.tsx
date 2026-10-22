"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { mayDeferOwnOnboarding, ONBOARDING_DEFERRED_MAX_AGE, writeGateCookie } from "@/lib/onboarding-gate";

export function AdminDeferBanner() {
  const { data: session } = useSession();
  const router = useRouter();

  const userId = session?.user?.id;
  const orgId = session?.orgId;
  const role = session?.user?.role;
  const canDefer = mayDeferOwnOnboarding(session);

  const destination = role === "ORG_ADMIN" ? "/hr" : "/dashboard";

  const handleDefer = useCallback(() => {
    if (!userId || !orgId) return;
    writeGateCookie("onboarding-deferred", `${userId}--${orgId}`, ONBOARDING_DEFERRED_MAX_AGE);
    router.push(destination);
  }, [orgId, router, userId, destination]);

  if (!canDefer || !userId || !orgId) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
      <p className="text-dense text-muted-foreground">
        You can add your bank details later from Profile → Bank — this page stays available.
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
