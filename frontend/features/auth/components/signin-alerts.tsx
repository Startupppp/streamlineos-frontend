"use client";

import { Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export function formatLockoutTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0)
    return `${mins} minute${mins !== 1 ? "s" : ""} and ${secs} second${secs !== 1 ? "s" : ""}`;
  return `${secs} second${secs !== 1 ? "s" : ""}`;
}

type SignInAlertsProps = {
  lockedSeconds: number | null;
  showVerificationHint: boolean;
  isResendingVerification: boolean;
  resendCooldown: number;
  onResendVerification: () => void;
};

export function SignInAlerts({
  lockedSeconds,
  showVerificationHint,
  isResendingVerification,
  resendCooldown,
  onResendVerification,
}: SignInAlertsProps) {
  return (
    <>
      {lockedSeconds !== null && (
        <div className="mb-2 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <Lock className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-destructive">
            Your account has been temporarily locked due to too many failed
            login attempts. Please try again in{" "}
            <span className="font-semibold">
              {formatLockoutTime(lockedSeconds)}
            </span>
            .
          </p>
        </div>
      )}

      {showVerificationHint && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <Mail className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-blue-800">
              Haven&apos;t verified your email yet?
            </p>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-sm text-blue-700 font-semibold"
              onClick={onResendVerification}
              disabled={isResendingVerification || resendCooldown > 0}
              aria-label={
                resendCooldown > 0
                  ? `Resend available in ${resendCooldown} seconds`
                  : "Resend verification email"
              }
            >
              {isResendingVerification
                ? "Sending…"
                : resendCooldown > 0
                  ? `Resend available in ${resendCooldown}s`
                  : "Resend verification email"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
