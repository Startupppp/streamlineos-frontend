"use client";

import { useState, useEffect, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { parseAuthErrorCode } from "@/lib/parse-auth-error";
import { MfaStep, PasswordlessSigninForm, OAuthButtons, SignInAlerts } from "@/features/auth";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  const [lockedSeconds, setLockedSeconds] = useState<number | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
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
      const message =
        oauthMessages[errorParam] ?? "Authentication failed. Please try again.";
      toast.error(message);
    }
  }, []);

  const getCallbackUrl = useCallback(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const url = params.get("callbackUrl");
      if (url && url.startsWith("/")) return url;
    }
    return "/post-signin";
  }, []);

  const googleSignInMutation = useMutation({
    mutationFn: async () => {
      await signIn("google", { callbackUrl: getCallbackUrl() });
    },
    onError: () => {
      toast.error("Google sign-in failed. Please try again.");
    },
  });

  const microsoftSignInMutation = useMutation({
    mutationFn: async () => {
      await signIn("microsoft-entra-id", { callbackUrl: getCallbackUrl() });
    },
    onError: () => {
      toast.error("Microsoft sign-in failed. Please try again.");
    },
  });

  const mfaMutation = useMutation({
    mutationFn: async (code: string) => {
      const result = await signIn("credentials", {
        magicToken: "",
        totpCode: code,
        redirect: false,
      });
      return result;
    },
    onSuccess: (result) => {
      toast.success("Welcome back!");
      if (result?.ok) {
        const target = result.url && result.url.length > 0 ? result.url : getCallbackUrl();
        window.location.href = target;
      }
    },
    onError: (error) => {
      if (error instanceof Error && error.message === "AUTH_INVALID_MFA_CODE") {
        setMfaError("Invalid code. Check your authenticator app and try again.");
        setMfaCode("");
        return;
      }
      toast.error(getErrorMessage(error));
    },
  });

  const handleGoogleSignIn = useCallback(() => googleSignInMutation.mutate(), [googleSignInMutation]);
  const handleMicrosoftSignIn = useCallback(() => microsoftSignInMutation.mutate(), [microsoftSignInMutation]);
  const handleMfaCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6));
    setMfaError(null);
  }, []);
  const handleMfaKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && mfaCode.length === 6) mfaMutation.mutate(mfaCode);
  }, [mfaCode, mfaMutation]);
  const handleMfaSubmit = useCallback(() => mfaMutation.mutate(mfaCode), [mfaMutation, mfaCode]);
  const handleMfaBack = useCallback(() => {
    setMfaRequired(false);
    setMfaCode("");
    setMfaError(null);
  }, []);

  const hasGoogleProvider = !!process.env.NEXT_PUBLIC_GOOGLE_ENABLED;
  const hasMicrosoftProvider = !!process.env.NEXT_PUBLIC_MICROSOFT_ENABLED;
  const hasOAuthProviders = hasGoogleProvider || hasMicrosoftProvider;

  if (mfaRequired) {
    return (
      <MfaStep
        code={mfaCode}
        onCodeChange={handleMfaCodeChange}
        onKeyDown={handleMfaKeyDown}
        onSubmit={handleMfaSubmit}
        onBack={handleMfaBack}
        isPending={mfaMutation.isPending}
        error={mfaError}
      />
    );
  }

  return (
    <div className="w-full max-w-sm animate-fade-up overflow-auto">
      <div className="mb-4 sm:mb-6 text-center">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          Sign in to your account
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Use your email to receive a one-time code
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
          <>
            <OAuthButtons
              hasGoogleProvider={hasGoogleProvider}
              hasMicrosoftProvider={hasMicrosoftProvider}
              isGooglePending={googleSignInMutation.isPending}
              isMicrosoftPending={microsoftSignInMutation.isPending}
              isSignInPending={false}
              onGoogleSignIn={handleGoogleSignIn}
              onMicrosoftSignIn={handleMicrosoftSignIn}
            />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-2 text-[11px] text-muted-foreground/60">
                  or
                </span>
              </div>
            </div>
          </>
        )}

        <PasswordlessSigninForm getCallbackUrl={getCallbackUrl} />

        <p className="text-[11px] text-muted-foreground/50 text-center leading-relaxed">
          Encrypted in transit over TLS. Sessions are signed and rotated.
        </p>
      </div>
    </div>
  );
}
