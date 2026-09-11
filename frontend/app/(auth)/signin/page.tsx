"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { parseAuthErrorCode } from "@/lib/parse-auth-error";
import { PasswordlessSigninForm, OAuthButtons, SignInAlerts } from "@/features/auth";
import { useGoogleSignIn, useMicrosoftSignIn } from "@/hooks/common/auth-hooks";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  const [lockedSeconds, setLockedSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");
    if (!errorParam) return;
    const parsed = parseAuthErrorCode(errorParam);
    if (parsed.code === "AUTH_ACCOUNT_LOCKED") {
      setLockedSeconds(parsed.retryAfterSeconds ?? null);
      return;
    }
    const oauthMessages: Record<string, string> = {
      AccessDenied:
        "No account found with that identity. Please contact your administrator.",
      OAuthSignin: "Could not start Google sign-in. Please try again.",
      OAuthCallback:
        "Google sign-in failed. Please try again or use your email.",
      OAuthCreateAccount:
        "Account setup failed. Please use your email instead.",
      OAuthAccountNotLinked:
        "This email is already registered. Sign in with your email, then link Google in settings.",
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
      if (url && url.startsWith("/") && !url.startsWith("//") && !url.includes("\\")) {
        return url;
      }
    }
    return "/dashboard";
  }, []);

  const googleSignInMutation = useGoogleSignIn(getCallbackUrl);
  const microsoftSignInMutation = useMicrosoftSignIn(getCallbackUrl);

  const handleGoogleSignIn = useCallback(
    () => googleSignInMutation.mutate(),
    [googleSignInMutation],
  );
  const handleMicrosoftSignIn = useCallback(
    () => microsoftSignInMutation.mutate(),
    [microsoftSignInMutation],
  );

  const hasGoogleProvider = !!process.env.NEXT_PUBLIC_GOOGLE_ENABLED;
  const hasMicrosoftProvider = !!process.env.NEXT_PUBLIC_MICROSOFT_ENABLED;
  const hasOAuthProviders = hasGoogleProvider || hasMicrosoftProvider;

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

      {lockedSeconds !== null && (
        <SignInAlerts
          lockedSeconds={lockedSeconds}
          showVerificationHint={false}
          isResendingVerification={false}
          resendCooldown={0}
          onResendVerification={() => undefined}
        />
      )}

      <div className="rounded-xl p-4 space-y-3">
        {hasOAuthProviders && (
          <OAuthButtons
            hasGoogleProvider={hasGoogleProvider}
            hasMicrosoftProvider={hasMicrosoftProvider}
            isGooglePending={googleSignInMutation.isPending}
            isMicrosoftPending={microsoftSignInMutation.isPending}
            isSignInPending={false}
            onGoogleSignIn={handleGoogleSignIn}
            onMicrosoftSignIn={handleMicrosoftSignIn}
          />
        )}

        <PasswordlessSigninForm getCallbackUrl={getCallbackUrl} />
      </div>
    </div>
  );
}
