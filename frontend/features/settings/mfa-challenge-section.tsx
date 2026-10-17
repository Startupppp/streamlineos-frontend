"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { useAccess } from "@/hooks/api/access";
import { useMfaStatus, useMfaChallenge } from "@/hooks/api/mfa";
import { getErrorMessage } from "@/lib/get-error-message";

export function MfaChallengeSection() {
  const router = useRouter();
  const { data: access } = useAccess();
  const { data: status } = useMfaStatus();
  const challenge = useMfaChallenge();

  const [token, setToken] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [useBackup, setUseBackup] = useState(false);

  const handleTokenChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setToken(e.target.value.replace(/\D/g, "").slice(0, 6));
    },
    [],
  );

  const handleBackupChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setBackupCode(e.target.value.toUpperCase().slice(0, 13));
    },
    [],
  );

  const handleUseBackup = useCallback(() => {
    setUseBackup(true);
    setToken("");
  }, []);

  const handleUseToken = useCallback(() => {
    setUseBackup(false);
    setBackupCode("");
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      await challenge.mutateAsync(
        useBackup ? { backupCode } : { token },
      );
      toast.success("Two-factor authentication confirmed");
      setToken("");
      setBackupCode("");
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [challenge, useBackup, backupCode, token, router]);

  const mfa = access?.mfa;
  const needsChallenge = mfa?.enforced === true && mfa.satisfied === false;
  if (!needsChallenge || status?.enabled !== true) return null;

  const canSubmit = useBackup ? backupCode.length > 0 : token.length === 6;

  return (
    <section className="space-y-4 rounded-xl border border-status-warning-rule bg-status-warning-surface p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-status-warning-ink" />
        <div className="min-w-0 space-y-1">
          <h2 className="text-sm font-semibold text-foreground">
            Confirm it&apos;s you to continue
          </h2>
          <p className="text-xs text-muted-foreground">
            Your organization requires two-factor authentication. Enter a code
            from your authenticator app to unlock this session.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        {useBackup ? (
          <>
            <Label htmlFor="mfa-challenge-backup" className="text-xs">
              Backup code
            </Label>
            <Input
              id="mfa-challenge-backup"
              value={backupCode}
              onChange={handleBackupChange}
              placeholder="XXXXXX-XXXXXX"
              className="w-48 text-center font-mono text-sm"
            />
          </>
        ) : (
          <>
            <Label htmlFor="mfa-challenge-token" className="text-xs">
              6-digit code
            </Label>
            <Input
              id="mfa-challenge-token"
              value={token}
              onChange={handleTokenChange}
              placeholder="000000"
              className="w-32 text-center font-mono text-sm"
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
            />
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <LoadingButton
          size="sm"
          onClick={handleSubmit}
          isPending={challenge.isPending}
          disabled={!canSubmit}
        >
          Confirm
        </LoadingButton>
        {useBackup ? (
          <Button type="button" size="sm" variant="ghost" onClick={handleUseToken}>
            Use authenticator code
          </Button>
        ) : (
          <Button type="button" size="sm" variant="ghost" onClick={handleUseBackup}>
            Use a backup code
          </Button>
        )}
      </div>
    </section>
  );
}
