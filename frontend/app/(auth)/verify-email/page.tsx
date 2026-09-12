"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  signInWithMagicToken,
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
import { useMotionVariants } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";

interface VerificationFailure {
  title: string;
  message: string;
}

type TokenAttempt =
  | { status: "in-flight" }
  | { status: "failed"; failure: VerificationFailure };

const attemptedTokens = new Map<string, TokenAttempt>();

const SIGN_IN_UNCONFIRMED_FAILURE: VerificationFailure = {
  title: "Sign-in not confirmed",
  message:
    "Your email is verified, but we could not confirm the sign-in on this device. Please sign in to continue.",
};
const SIGN_IN_FAILED_FAILURE: VerificationFailure = {
  title: "Sign-in incomplete",
  message:
    "Your email is verified, but the automatic sign-in link is no longer valid. Please sign in to continue.",
};
const MISSING_LOGIN_TOKEN_FAILURE: VerificationFailure = {
  title: "Sign-in incomplete",
  message:
    "Your email is verified, but no sign-in token was issued. Please sign in to continue.",
};
const INTERRUPTED_ATTEMPT_FAILURE: VerificationFailure = {
  title: "Verification result unavailable",
  message:
    "This verification link was already used on this device and its result is no longer available here. Please sign in, or request a new link.",
};

function restoreFailure(token: string | null): VerificationFailure | null {
  if (!token) return null;
  const attempt = attemptedTokens.get(token);
  if (attempt === undefined) return null;
  if (attempt.status === "failed") return attempt.failure;
  return INTERRUPTED_ATTEMPT_FAILURE;
}

function AuthStatusShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { staggerContainer } = useMotionVariants();

  return (
    <motion.div
      className={cn("w-full max-w-sm", className)}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}

function AuthStatusSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { fadeUp } = useMotionVariants();

  return (
    <motion.div variants={fadeUp} className={className}>
      {children}
    </motion.div>
  );
}

function SuccessIcon() {
  const { scaleIn } = useMotionVariants();

  return (
    <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center">
      <div
        className="absolute inset-0 rounded-full bg-status-success-surface"
        aria-hidden="true"
      />
      <motion.div
        variants={scaleIn}
        className="relative flex h-14 w-14 items-center justify-center rounded-full border border-status-success-rule bg-card shadow-sm"
      >
        <CheckCircle2
          className="w-7 text-status-success-ink"
          strokeWidth={1.75}
          aria-hidden="true"
        />
      </motion.div>
    </div>
  );
}

function SetupProgress() {
  const [progress, setProgress] = useState(12);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 88) return prev;
        return Math.min(88, prev + 4 + Math.random() * 6);
      });
    }, 450);

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-border bg-card p-4 space-y-3 text-left shadow-sm"
    >
      <div className="flex items-center gap-2.5">
        <Loader2
          className="h-3.5 w-3.5 animate-spin text-status-info-ink shrink-0"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">Setting up your account…</p>
      </div>
      <Progress value={progress} className="h-1 bg-muted [&>div]:bg-status-info-fill" />
    </div>
  );
}

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const [isVerified, setIsVerified] = useState(false);
  const [verifyFailure, setVerifyFailure] = useState<VerificationFailure | null>(
    () => restoreFailure(token),
  );
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

  const { mutate: verifyMutate } = verifyEmail;

  const completeAutoSignIn = useCallback(
    async (verificationToken: string, autoLoginToken: string | undefined) => {
      if (!autoLoginToken) {
        attemptedTokens.set(verificationToken, {
          status: "failed",
          failure: MISSING_LOGIN_TOKEN_FAILURE,
        });
        setIsVerified(false);
        setVerifyFailure(MISSING_LOGIN_TOKEN_FAILURE);
        toast.error(MISSING_LOGIN_TOKEN_FAILURE.message);
        return;
      }
      const outcome = await signInWithMagicToken(autoLoginToken);
      if (outcome.status === "signed-in") {
        attemptedTokens.delete(verificationToken);
        window.location.href = "/org-setup";
        return;
      }
      const failure =
        outcome.status === "indeterminate"
          ? SIGN_IN_UNCONFIRMED_FAILURE
          : SIGN_IN_FAILED_FAILURE;
      attemptedTokens.set(verificationToken, { status: "failed", failure });
      setIsVerified(false);
      setVerifyFailure(failure);
      toast.error(failure.message);
    },
    [],
  );

  const runVerification = useCallback(
    (verificationToken: string) => {
      attemptedTokens.set(verificationToken, { status: "in-flight" });
      setIsVerified(false);
      setVerifyFailure(null);
      verifyMutate(
        { token: verificationToken },
        {
          onSuccess: async (data) => {
            setIsVerified(true);
            toast.success("Email verified! Signing you in…");
            await completeAutoSignIn(verificationToken, data.autoLoginToken);
          },
          onError: (error) => {
            const failure = {
              title: "Verification failed",
              message: getErrorMessage(error),
            };
            attemptedTokens.set(verificationToken, {
              status: "failed",
              failure,
            });
            setVerifyFailure(failure);
            toast.error(failure.message);
          },
        },
      );
    },
    [verifyMutate, completeAutoSignIn],
  );

  useEffect(() => {
    if (!token) return;
    if (attemptedTokens.has(token)) {
      setIsVerified(false);
      setVerifyFailure(restoreFailure(token));
      return;
    }
    runVerification(token);
  }, [token, runVerification]);

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
    runVerification(token);
  }, [token, runVerification]);

  if (isVerified) {
    return (
      <AuthStatusShell className="text-center">
        <AuthStatusSection>
          <SuccessIcon />
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            Email verified
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Signing you in automatically…
          </p>
        </AuthStatusSection>

        <AuthStatusSection className="mt-6">
          <SetupProgress />
        </AuthStatusSection>
      </AuthStatusShell>
    );
  }

  if (verifyEmail.isPending) {
    return (
      <AuthStatusShell className="text-center">
        <AuthStatusSection>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted/60">
            <Loader2
              className="h-6 w-6 animate-spin text-status-info-ink"
              aria-hidden="true"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            Verifying email
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Please wait while we confirm your email address
          </p>
        </AuthStatusSection>

        <AuthStatusSection className="mt-6">
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <p className="text-sm text-muted-foreground">
              This will only take a moment…
            </p>
            <Progress value={45} className="mt-3 h-1 bg-muted [&>div]:bg-status-info-fill" />
          </div>
        </AuthStatusSection>
      </AuthStatusShell>
    );
  }

  if (verifyFailure) {
    return (
      <AuthStatusShell>
        <AuthStatusSection className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-destructive/20 bg-destructive/5">
            <XCircle className="w-7 text-destructive" aria-hidden="true" />
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            {verifyFailure.title}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {verifyFailure.message}
          </p>
        </AuthStatusSection>

        <AuthStatusSection className="mt-6 space-y-3">
          {email && (
            <Button
              variant="default"
              className="w-full h-9 text-sm"
              onClick={handleResend}
              disabled={resendVerification.isPending || cooldown > 0}
              aria-label={
                cooldown > 0
                  ? `Resend available in ${cooldown} seconds`
                  : "Send a new verification link"
              }
            >
              {resendVerification.isPending ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
              )}
              {cooldown > 0
                ? `Resend available in ${cooldown}s`
                : "Send a new verification link"}
            </Button>
          )}

          <Button
            variant={email ? "outline" : "default"}
            className="w-full h-9 text-sm"
            onClick={handleRetry}
            disabled={verifyEmail.isPending}
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Try again
          </Button>

          <Link href="/signin" className="block">
            <Button variant="outline" className="w-full h-9 text-sm">
              <ArrowLeft className="mr-2 h-3.5 w-3.5" />
              Back to sign in
            </Button>
          </Link>
        </AuthStatusSection>
      </AuthStatusShell>
    );
  }

  return (
    <AuthStatusShell>
      <AuthStatusSection className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted/60">
          <Mail className="h-6 w-6 text-foreground" aria-hidden="true" />
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          Check your email
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          We sent a verification link to your address. Click it to verify your
          account and get started.
        </p>
      </AuthStatusSection>

      <AuthStatusSection className="mt-6 space-y-3">
        {email && (
          <div className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
            <p className="text-label text-muted-foreground">
              Verification email sent to
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">{email}</p>
          </div>
        )}

        <div
          role="status"
          className="rounded-xl border border-border bg-muted/40 p-3.5 text-left"
        >
          <p className="text-sm text-muted-foreground">
            Click the link in the email to verify your account. The link expires
            in 24 hours.
          </p>
        </div>

        <aside
          aria-label="Email delivery help"
          className="rounded-xl border border-border bg-card p-3.5 flex items-start gap-2.5 text-left shadow-sm"
        >
          <AlertCircle
            className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <p className="text-xs text-muted-foreground">
            Didn&apos;t receive an email? Check your spam folder or contact
            support.
          </p>
        </aside>

        {email && (
          <Button
            variant="ghost"
            className="w-full h-9 text-sm"
            onClick={handleResend}
            disabled={resendVerification.isPending || cooldown > 0}
            aria-label={
              cooldown > 0
                ? `Resend available in ${cooldown} seconds`
                : "Resend verification link"
            }
          >
            {resendVerification.isPending ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
            )}
            {cooldown > 0
              ? `Resend available in ${cooldown}s`
              : "Resend verification link"}
          </Button>
        )}

        <Link href="/signin" className="block">
          <Button variant="outline" className="w-full h-9 text-sm">
            <ArrowLeft className="mr-2 h-3.5 w-3.5" />
            Back to sign in
          </Button>
        </Link>
      </AuthStatusSection>
    </AuthStatusShell>
  );
}

function LoadingCard() {
  return (
    <div className="w-full max-w-sm text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted/60">
        <Loader2
          className="h-6 w-6 animate-spin text-status-info-ink"
          aria-hidden="true"
        />
      </div>
      <p className="text-sm text-muted-foreground">Loading…</p>
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
