"use client";

import { useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { LoadingButton } from "@/components/ui/loading-button";
import { Monitor, Smartphone } from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useSessions, useRevokeSession, useRevokeAllSessions } from "@/hooks/api/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { TruncatedText } from "@/components/ui/truncated-text";
import { formatClientDeviceLabel } from "@/lib/format-utils";

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
          <TruncatedText text={formatClientDeviceLabel(s)} className="text-[13px] font-medium" />
          {s.isCurrent && (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-emerald-300 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30">
              Current
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
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
  const { data: sessions, isLoading } = useSessions();
  const revokeOne = useRevokeSession();
  const revokeAll = useRevokeAllSessions();

  const handleRevokeOne = useCallback((sessionId: string) => {
    revokeOne.mutate(sessionId, {
      onSuccess: () => toast.success("Session revoked"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [revokeOne]);

  const handleRevokeAll = useCallback(() => {
    revokeAll.mutate(undefined, {
      onSuccess: (data) => {
        const count =
          data !== null &&
          typeof data === "object" &&
          "revokedCount" in data &&
          typeof (data as Record<string, unknown>).revokedCount === "number"
            ? (data as Record<string, unknown>).revokedCount as number
            : 0;
        toast.success(`Signed out ${count} other session${count !== 1 ? "s" : ""}`);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [revokeAll]);

  const [revokeAllOpen, setRevokeAllOpen] = useState(false);
  const otherSessions = sessions?.filter((s) => !s.isCurrent) ?? [];
  const handleOpenRevokeAll = useCallback(() => setRevokeAllOpen(true), []);

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-foreground">Active sessions</p>
            <p className="text-[11px] text-muted-foreground">Manage where you are signed in.</p>
          </div>
        </div>
        {otherSessions.length > 0 && (
          <>
            <LoadingButton
              variant="outline"
              size="sm"
              className="h-8 text-xs"
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
      ) : !sessions?.length ? (
        <p className="text-[12px] text-muted-foreground text-center py-4">No active sessions found.</p>
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

export function SettingsSecurity() {
  return (
    <div className="space-y-4">
      <SessionsSection />
    </div>
  );
}
