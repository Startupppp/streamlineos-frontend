"use client";

import { useState, useEffect, useCallback } from "react";
import { LogIn } from "lucide-react";
import { toast } from "sonner";
import { parseAuthErrorCode } from "@/lib/parse-auth-error";
import { PasswordlessSigninForm, OAuthButtons, SignInAlerts } from "@/features/auth";
import { useGoogleSignIn } from "@/hooks/common/auth-hooks";
import { hasGoogleProvider } from "@/lib/auth-providers";
import {
  SESSION_EXPIRED_QUERY,
  SESSION_EXPIRED_VALUE,
} from "@/lib/auth-session-cookies";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  const [lockedSeconds, setLockedSeconds] = useState<number | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);

    if (params.get(SESSION_EXPIRED_QUERY) === SESSION_EXPIRED_VALUE) {
      setSessionExpired(true);
    }

    const errorParam = params.get("error");
    if (!errorParam) return;
    const parsed = parseAuthErrorCode(errorParam);
    if (parsed.code === "AUTH_ACCOUNT_LOCKED") {
      setLockedSeconds(parsed.retryAfterSeconds ?? null);
      return;
    }
    const oauthMessages: Record<string, string> = {
      AccessDenied:
        "Sign-in could not be completed. Please contact your administrator.",
      OAuthSignin: "Could not start Google sign-in. Please try again.",
      OAuthCallback:
        "Google sign-in failed. Please try again or use your email.",
      OAuthCreateAccount:
        "Account setup failed. Please use your email instead.",
      OAuthAccountNotLinked:
        "Google sign-in could not be completed. Sign in with your email instead — you can connect Google in your account settings.",
      Configuration:
        "Authentication is misconfigured. Please contact support.",
    };
    toast.error(
      oauthMessages[errorParam] ?? "Authentication failed. Please try again.",
    );
  }, []);

  const getCallbackUrl = useCallback(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const url = params.get("callbackUrl");
      if (
        url &&
        url.startsWith("/") &&
        !url.startsWith("//") &&
        !url.includes("\\") &&
        !url.split("?")[0].startsWith("/signin")
      ) {
        return url;
      }
    }
    return "/dashboard";
  }, []);

  const googleSignInMutation = useGoogleSignIn(getCallbackUrl);

  const handleGoogleSignIn = useCallback(
    () => googleSignInMutation.mutate(),
    [googleSignInMutation],
  );

  const handleResendVerification = useCallback(() => undefined, []);

  return (
    <div className="w-full max-w-sm animate-fade-up overflow-auto">
      <div className="mb-4 sm:mb-6 text-center">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          Sign in or create an account
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Use Google or your email for a one-time code
        </p>
      </div>

      {sessionExpired && (
        <div className="mb-2 flex items-start gap-2.5 rounded-lg border border-status-info-rule bg-status-info-surface px-4 py-3">
          <LogIn className="h-4 w-4 text-status-info-ink mt-0.5 shrink-0" aria-hidden="true" />
          <p className="text-sm text-status-info-ink">
            Your session expired. Sign in again to continue.
          </p>
        </div>
      )}

      {lockedSeconds !== null && (
        <SignInAlerts
          lockedSeconds={lockedSeconds}
          showVerificationHint={false}
          isResendingVerification={false}
          resendCooldown={0}
          onResendVerification={handleResendVerification}
        />
      )}

      <div className="rounded-xl p-4 space-y-3">
        {hasGoogleProvider && (
          <OAuthButtons
            hasGoogleProvider={hasGoogleProvider}
            isGooglePending={googleSignInMutation.isPending}
            isSignInPending={false}
            onGoogleSignIn={handleGoogleSignIn}
          />
        )}

        <PasswordlessSigninForm getCallbackUrl={getCallbackUrl} />
      </div>
    </div>
  );
}
