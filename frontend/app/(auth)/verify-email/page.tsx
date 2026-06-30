"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useVerifyEmail,
  useResendVerificationEmail,
} from "@/hooks/common/auth-hooks";
import {
  CheckCircle2,
  Mail,
  Loader2,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { getErrorMessage } from "@/lib/get-error-message";
import { signIn } from "next-auth/react";

const attemptedTokens = new Set<string>();

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const [isVerified, setIsVerified] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = useCallback(() => {
    setCooldown(60);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const verifyEmail = useVerifyEmail();
  const resendVerification = useResendVerificationEmail();

  const verifyMutateRef = useRef(verifyEmail.mutate);
  verifyMutateRef.current = verifyEmail.mutate;

  useEffect(() => {
    if (!token) return;
    if (attemptedTokens.has(token)) return;
    attemptedTokens.add(token);

    verifyMutateRef.current(
      { token },
      {
        onSuccess: async (data) => {
          setIsVerified(true);
          toast.success("Email verified! Signing you in…");
          const result = await signIn("credentials", {
            magicToken: data.autoLoginToken,
            redirect: false,
          });
          if (result?.ok) {
            window.location.href = "/org-setup";
          } else {
            setTimeout(() => router.push("/signin"), 1500);
          }
        },
        onError: (error) => {
          const msg = getErrorMessage(error);
          setVerifyError(msg);
          toast.error(msg);
        },
      },
    );
  }, [token, router]);

  const handleResend = useCallback(() => {
    if (!email || cooldown > 0) return;
    resendVerification.mutate(
      { email },
      {
        onSuccess: () => {
          toast.success("Verification email resent!");
          startCooldown();
        },
        onError: () => {
          toast.error("Failed to resend email");
        },
      },
    );
  }, [email, cooldown, resendVerification, startCooldown]);

  const handleRetry = useCallback(() => {
    if (!token) return;
    attemptedTokens.delete(token);
    setVerifyError(null);
    verifyMutateRef.current(
      { token },
      {
        onSuccess: async (data) => {
          setIsVerified(true);
          toast.success("Email verified! Signing you in…");
          const result = await signIn("credentials", {
            magicToken: data.autoLoginToken,
            redirect: false,
          });
          if (result?.ok) {
            window.location.href = "/org-setup";
          } else {
            setTimeout(() => router.push("/signin"), 1500);
          }
        },
        onError: (error) => {
          const msg = getErrorMessage(error);
          setVerifyError(msg);
          toast.error(msg);
        },
      },
    );
  }, [token, router]);

  if (isVerified) {
    return (
      <div className="w-full max-w-md animate-fade-up">
        <div className="text-center mb-5 sm:mb-8">
          <div className="mx-auto h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center mb-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            Email Verified!
          </h1>
          <p className="text-muted-foreground mt-2">
            Signing you in automatically…
          </p>
        </div>

        <div className="rounded-xl border bg-card shadow-soft p-4 sm:p-6 space-y-4">
          <div
            role="status"
            aria-live="polite"
            className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-2"
          >
            <Loader2 className="h-4 w-4 text-green-600 animate-spin shrink-0" />
            <p className="text-sm text-green-600">Setting up your account…</p>
          </div>
        </div>
      </div>
    );
  }

  if (verifyEmail.isPending) {
    return (
      <div className="w-full max-w-md animate-fade-up">
        <div className="text-center mb-5 sm:mb-8">
          <div className="mx-auto h-10 w-10 rounded-xl bg-muted flex items-center justify-center mb-3">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            Verifying Email
          </h1>
          <p className="text-muted-foreground mt-2">
            Please wait while we verify your email address
          </p>
        </div>

        <div className="rounded-xl border bg-card shadow-soft p-4 sm:p-6">
          <p className="animate-pulse text-sm text-muted-foreground text-center">
            This will only take a moment...
          </p>
        </div>
      </div>
    );
  }

  if (verifyError) {
    return (
      <div className="w-full max-w-md animate-fade-up">
        <div className="text-center mb-5 sm:mb-8">
          <div className="mx-auto h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center mb-3">
            <XCircle className="h-5 w-5 text-destructive" />
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            Verification Failed
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            The link may have expired or already been used.
          </p>
        </div>

        <div className="rounded-xl border bg-card shadow-soft p-4 sm:p-6 space-y-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-sm text-destructive">{verifyError}</p>
          </div>

          {email && (
            <Button
              variant="default"
              className="w-full"
              onClick={handleResend}
              disabled={resendVerification.isPending || cooldown > 0}
              aria-label={
                cooldown > 0
                  ? `Resend available in ${cooldown} seconds`
                  : "Send a new verification link"
              }
            >
              {resendVerification.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {cooldown > 0
                ? `Resend available in ${cooldown}s`
                : "Send a new verification link"}
            </Button>
          )}

          <Button variant="ghost" className="w-full" onClick={handleRetry} disabled={verifyEmail.isPending}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>

          <Link href="/signin" className="block">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md animate-fade-up">
      <div className="text-center mb-5 sm:mb-8">
        <div className="mx-auto h-10 w-10 rounded-xl bg-muted flex items-center justify-center mb-3">
          <Mail className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          Check your email
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          We&apos;ve sent a verification link to your address. Please click the
          link to verify your account and get started.
        </p>
      </div>

      <div className="rounded-xl border bg-card shadow-soft p-4 sm:p-6 space-y-4">
        {email && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Verification email sent to
            </p>
            <p className="font-medium text-foreground mt-1">{email}</p>
          </div>
        )}

        <div
          role="status"
          className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4"
        >
          <p className="text-sm text-blue-600">
            Click the link in the email to verify your account. The link will
            expire in 24 hours.
          </p>
        </div>

        <aside
          aria-label="Email delivery help"
          className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2"
        >
          <AlertCircle
            className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0"
            aria-hidden="true"
          />
          <p className="text-xs text-amber-600">
            Didn&apos;t receive an email? Check your spam folder or contact
            support.
          </p>
        </aside>

        {email && (
          <Button
            variant="ghost"
            className="w-full"
            onClick={handleResend}
            disabled={resendVerification.isPending || cooldown > 0}
            aria-label={
              cooldown > 0
                ? `Resend available in ${cooldown} seconds`
                : "Resend verification link"
            }
          >
            {resendVerification.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {cooldown > 0
              ? `Resend available in ${cooldown}s`
              : "Resend Verification Link"}
          </Button>
        )}

        <Link href="/signin" className="block">
          <Button variant="outline" className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Button>
        </Link>
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="w-full max-w-md">
      <div className="rounded-xl border bg-card shadow-soft p-4 sm:p-6">
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingCard />}>
      <VerifyEmailForm />
    </Suspense>
  );
}
