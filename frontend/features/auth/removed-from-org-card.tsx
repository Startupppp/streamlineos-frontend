"use client";

import { useCallback } from "react";
import { UserX } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { useSignOut } from "@/hooks/common/auth-hooks";

export function RemovedFromOrgCard() {
  const signOut = useSignOut();

  const handleSignOut = useCallback(() => {
    signOut.mutate();
  }, [signOut]);

  return (
    <section
      className="w-full max-w-md animate-fade-up"
      aria-labelledby="removed-from-org-title"
    >
      <div className="rounded-2xl border border-status-danger-rule bg-card p-6 shadow-[0_20px_55px_-28px_rgba(127,29,29,0.3)] sm:p-8">
        <div className="flex size-12 items-center justify-center rounded-xl bg-status-danger-surface ring-1 ring-status-danger-rule">
          <UserX className="size-6 text-status-danger-ink" aria-hidden="true" />
        </div>

        <div className="mt-5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-status-danger-ink">
            Removed from organisation
          </p>
          <h1
            id="removed-from-org-title"
            className="font-display text-2xl font-bold tracking-tight text-foreground"
          >
            You were removed from this workspace
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            An administrator removed your membership. You can no longer access
            this workspace. Sign in with a different account or contact the
            organisation owner to request access again.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <LoadingButton
            type="button"
            className="flex-1"
            isPending={signOut.isPending}
            loadingText="Signing out…"
            onClick={handleSignOut}
          >
            Sign out
          </LoadingButton>
        </div>
      </div>
    </section>
  );
}
