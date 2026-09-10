"use client";

import { useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { LoadingButton } from "@/components/ui/loading-button";
import { LogIn, Monitor, Smartphone } from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useSessions, useRevokeSession, useRevokeAllSessions } from "@/hooks/api/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { TruncatedText } from "@/components/ui/truncated-text";
import { formatClientDeviceLabel } from "@/lib/format-utils";
import { useLoginHistory } from "@/hooks/api/auth";
import { ACCOUNT_LOGIN_HISTORY_PARAMS } from "@/lib/settings-initial-reads";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";

function getDeviceIcon(session: { os: string | null; platform: string | null }) {
  const label = `${session.os ?? ""} ${session.platform ?? ""}`.toLowerCase();
  if (label.includes("mobile") || label.includes("android") || label.includes("ios")) {
    return <Smartphone className="h-4 w-4" />;
  }
  return <Monitor className="h-4 w-4" />;
}

type SessionData = {
  id: string;
  isCurrent: boolean;
  browser: string;
  os: string | null;
  platform: string | null;
  ipAddress: string | null;
  lastActive: string | Date;
};

interface SessionRowProps {
  session: SessionData;
  onRevoke: (id: string) => void;
  revokePending: boolean;
}

function SessionRow({ session: s, onRevoke, revokePending }: SessionRowProps) {
  const handleRevoke = useCallback(() => onRevoke(s.id), [s.id, onRevoke]);
  return (
    <div className="flex items-center gap-3 p-3 rounded-md border bg-muted/30">
      <span className="text-muted-foreground flex-shrink-0">{getDeviceIcon(s)}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <TruncatedText text={formatClientDeviceLabel(s)} className="text-label font-medium" />
          {s.isCurrent && (
            <Badge variant="outline" className="text-micro h-4 px-1.5 border-status-success-rule text-status-success-ink bg-status-success-surface">
              Current
            </Badge>
          )}
        </div>
        <p className="text-dense text-muted-foreground">
          {s.ipAddress ? `${s.ipAddress} · ` : ""}
          Active {formatDistanceToNow(new Date(s.lastActive), { addSuffix: true })}
        </p>
      </div>
      {!s.isCurrent && (
        <AnimatedIconButton
          icon={Trash2Icon}
          iconSize={14}
          size="icon"
          variant="ghost"
          className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
          onClick={handleRevoke}
          disabled={revokePending}
          aria-label="Revoke session"
        />
      )}
    </div>
  );
}

function SessionsSection() {
  const { data: sessions, isLoading, isError, error, refetch } = useSessions();
  const revokeOne = useRevokeSession();
  const revokeAll = useRevokeAllSessions();

  const handleRetrySessions = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleRevokeOne = useCallback((sessionId: string) => {
    revokeOne.mutate(sessionId, {
      onSuccess: () => toast.success("Session revoked"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [revokeOne]);

  const handleRevokeAll = useCallback(() => {
    revokeAll.mutate(undefined, {
      onSuccess: ({ revokedCount }) => {
        toast.success(
          `Signed out ${revokedCount} other session${revokedCount !== 1 ? "s" : ""}`,
        );
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [revokeAll]);

  const [revokeAllOpen, setRevokeAllOpen] = useState(false);
  const otherSessions = sessions?.filter((s) => !s.isCurrent) ?? [];
  const handleOpenRevokeAll = useCallback(() => setRevokeAllOpen(true), []);

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-label font-semibold text-foreground">My sessions</p>
            <p className="text-dense text-muted-foreground">
              Manage the devices signed in to your account.
            </p>
          </div>
        </div>
        {otherSessions.length > 0 && (
          <>
            <LoadingButton
              variant="outline"
              size="sm"
              isPending={revokeAll.isPending}
              onClick={handleOpenRevokeAll}
              loadingText="Signing out…"
            >
              Sign out all others
            </LoadingButton>
            <ConfirmDialog
              open={revokeAllOpen}
              onOpenChange={setRevokeAllOpen}
              title="Sign out other sessions?"
              description={`This will immediately revoke ${otherSessions.length} other session${otherSessions.length !== 1 ? "s" : ""}. Those devices will need to sign in again.`}
              confirmLabel="Sign out"
              onConfirm={handleRevokeAll}
            />
          </>
        )}
      </div>

      <div className="h-px bg-border" />

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 rounded-md bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          compact
          description={getErrorMessage(error)}
          onRetry={handleRetrySessions}
          className="mt-3"
        />
      ) : !sessions?.length ? (
        <EmptyState
          compact
          illustrationPreset="security"
          title="No active sessions"
          description="Signed-in devices appear here. Sign in on another device to see it listed."
        />
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <SessionRow key={s.id} session={s} onRevoke={handleRevokeOne} revokePending={revokeOne.isPending} />
          ))}
        </div>
      )}
    </div>
  );
}

type LoginEntry = NonNullable<ReturnType<typeof useLoginHistory>["data"]>["data"][number];

function SignInRow({ entry }: { entry: LoginEntry }) {
  const client = [entry.browser, entry.os].filter(Boolean).join(" on ");

  return (
    <div className="flex items-center gap-3 border-b border-border/60 py-3 last:border-0">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <LogIn className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-label font-medium text-foreground">
            {client || "Unknown client"}
          </p>
          <Badge
            variant="outline"
            className={entry.success
              ? "h-5 shrink-0 border-status-success-rule bg-status-success-surface px-2 text-micro text-status-success-ink"
              : "h-5 shrink-0 border-destructive/30 bg-destructive/10 px-2 text-micro text-destructive"}
          >
            {entry.success ? "Successful" : "Failed"}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-dense text-muted-foreground">
          {entry.ipAddress ?? "IP unavailable"} · {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

function RecentSignInsSection() {
  const { data, isLoading, isError, error, refetch } = useLoginHistory(ACCOUNT_LOGIN_HISTORY_PARAMS);
  const entries = data?.data ?? [];

  function handleRetry() {
    void refetch();
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
          <LogIn className="size-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-label font-semibold text-foreground">Recent sign-ins</p>
          <p className="text-dense text-muted-foreground">
            Review the latest successful and failed access attempts.
          </p>
        </div>
      </div>

      <div className="border-t border-border">
        {isLoading ? (
          <div className="space-y-3 pt-3">
            {[1, 2, 3].map((row) => (
              <Skeleton key={row} className="h-10 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            compact
            description={getErrorMessage(error)}
            onRetry={handleRetry}
            className="mt-3"
          />
        ) : entries.length === 0 ? (
          <EmptyState
            compact
            illustrationPreset="security"
            title="No sign-in activity yet"
            description="Successful and failed access attempts are recorded here as they happen."
          />
        ) : (
          entries.map((entry) => <SignInRow key={entry.id} entry={entry} />)
        )}
      </div>
    </div>
  );
}

export function SettingsSecurity() {
  return (
    <div className="space-y-4">
      <SessionsSection />
      <RecentSignInsSection />
    </div>
  );
}
