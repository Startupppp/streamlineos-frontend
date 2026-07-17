"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { signIn } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { apiClient } from "@/lib/api-client";
import { parseAuthErrorCode } from "@/lib/parse-auth-error";
import { MfaStep, MagicLinkForm, EmailOtpForm, OAuthButtons, SignInAlerts } from "@/features/auth";

export const dynamic = "force-dynamic";

const RESEND_COOLDOWN_SECONDS = 60;

export default function SignInPage() {
  const [lockedSeconds, setLockedSeconds] = useState<number | null>(null);
  const [showVerificationHint, setShowVerificationHint] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const resendCooldownRef = useRef<NodeJS.Timeout | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  useEffect(() => {
    return () => {
      if (resendCooldownRef.current) clearInterval(resendCooldownRef.current);
    };
  }, []);

  const startResendCooldown = useCallback(() => {
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    if (resendCooldownRef.current) clearInterval(resendCooldownRef.current);
    resendCooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (resendCooldownRef.current) clearInterval(resendCooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

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
          "No account found with that identity. Please sign up first or use your email.",
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

  const magicLinkMutation = useMutation({
    mutationFn: (email: string) =>
      apiClient.post<{ message: string }>("/auth/magic-link", { email }),
    onSuccess: () => {
      setMagicLinkSent(true);
    },
    onError: () => {
      toast.error("Failed to send magic link. Please try again.");
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

  const handleResendVerification = useCallback(async () => {
    const email = verificationEmail.trim();
    if (!email || resendCooldown > 0) return;
    setIsResendingVerification(true);
    try {
      await apiClient.post("/auth/resend-verification", { email });
      toast.success("Verification email sent. Check your inbox.");
      startResendCooldown();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsResendingVerification(false);
    }
  }, [verificationEmail, resendCooldown, startResendCooldown]);

  const handleShowMagicLink = useCallback(() => setShowMagicLink(true), []);
  const handleMagicLinkEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setMagicLinkEmail(e.target.value), []);
  const handleSendMagicLink = useCallback(() => magicLinkMutation.mutate(magicLinkEmail), [magicLinkMutation, magicLinkEmail]);
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

      <SignInAlerts
        lockedSeconds={lockedSeconds}
        showVerificationHint={showVerificationHint}
        isResendingVerification={isResendingVerification}
        resendCooldown={resendCooldown}
        onResendVerification={handleResendVerification}
      />

      <div className="rounded-xl p-4 space-y-3">
        <EmailOtpForm
          isVisible
          onShow={() => {}}
          getCallbackUrl={getCallbackUrl}
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

        <MagicLinkForm
          isVisible={showMagicLink}
          isSent={magicLinkSent}
          email={magicLinkEmail}
          onEmailChange={handleMagicLinkEmailChange}
          onSend={handleSendMagicLink}
          isPending={magicLinkMutation.isPending}
          onShow={handleShowMagicLink}
        />

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

        <p className="text-sm text-center text-muted-foreground">
          {"Don't have an account? "}
          <Link
            href="/signup"
            className="text-blue-600 hover:underline font-medium"
          >
            Sign up free
          </Link>
        </p>

        <p className="text-[11px] text-muted-foreground/50 text-center leading-relaxed">
          Encrypted in transit over TLS. Sessions are signed and rotated.
        </p>
      </div>
    </div>
  );
}
