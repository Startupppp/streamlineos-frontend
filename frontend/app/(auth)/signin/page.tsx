"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, ArrowRight, Lock, Mail, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { validatePasswordStrength } from "@/lib/password-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { apiClient } from "@/lib/api-client";

export const dynamic = "force-dynamic";

const signinSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type FormValues = z.infer<typeof signinSchema>;

function formatLockoutTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0)
    return `${mins} minute${mins !== 1 ? "s" : ""} and ${secs} second${secs !== 1 ? "s" : ""}`;
  return `${secs} second${secs !== 1 ? "s" : ""}`;
}

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [lockedSeconds, setLockedSeconds] = useState<number | null>(null);
  const [passwordValue, setPasswordValue] = useState("");
  const [showVerificationHint, setShowVerificationHint] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState<string | null>(null);
  const pendingCredentials = useRef<{ email: string; password: string; rememberMe: boolean } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(signinSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get("error");
      if (!errorParam) return;
      if (errorParam.startsWith("ACCOUNT_LOCKED:")) {
        const secs = parseInt(errorParam.split(":")[1] ?? "0", 10);
        setLockedSeconds(isNaN(secs) ? null : secs);
        return;
      }
      const oauthMessages: Record<string, string> = {
        AccessDenied: "No account found with that identity. Please sign up first or use email and password.",
        OAuthSignin: "Could not start Google sign-in. Please try again.",
        OAuthCallback: "Google sign-in failed. Please try again or use email and password.",
        OAuthCreateAccount: "Account setup failed. Please use email and password instead.",
        OAuthAccountNotLinked: "This email is already registered. Sign in with your password, then link Google in settings.",
        Configuration: "Authentication is misconfigured. Please contact support.",
      };
      const message = oauthMessages[errorParam] ?? "Authentication failed. Please try again.";
      toast.error(message);
    }
  }, []);

  const getCallbackUrl = () => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const url = params.get("callbackUrl");
      if (url && url.startsWith("/")) return url;
    }
    // Route through /post-signin so the server can decide between
    // /owner (PLATFORM_OWNER) and /dashboard (everyone else) based on role.
    return "/post-signin";
  };

  const doSignIn = async (email: string, password: string, rememberMe: boolean, totpCode?: string) => {
    if (!navigator.onLine) throw new Error("No internet connection. Check your network and try again.");
    try {
      const result = await signIn("credentials", {
        email,
        password,
        rememberMe: rememberMe ? "true" : "false",
        ...(totpCode ? { totpCode } : {}),
        callbackUrl: getCallbackUrl(),
        redirect: false,
      });
      if (result?.error) {
        if (result.error.startsWith("ACCOUNT_LOCKED:")) {
          const secs = parseInt(result.error.split(":")[1] ?? "0", 10);
          setLockedSeconds(isNaN(secs) ? null : secs);
          throw new Error(`Account locked. Try again in ${formatLockoutTime(isNaN(secs) ? 900 : secs)}.`);
        }
        if (result.error === "SUBSCRIPTION_INACTIVE") throw new Error("SUBSCRIPTION_INACTIVE");
        if (result.error === "REQUIRES_MFA") throw new Error("REQUIRES_MFA");
        if (result.error === "INVALID_MFA_CODE") throw new Error("INVALID_MFA_CODE");
        setShowVerificationHint(true);
        throw new Error("Invalid email or password. If you just signed up, check your inbox to verify your email first.");
      }
      return result;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error("No internet connection. Check your network and try again.");
      }
      throw error;
    }
  };

  const signInMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      return doSignIn(data.email, data.password, data.rememberMe ?? false);
    },
    onSuccess: (result) => {
      toast.success("Welcome back!");
      if (result?.ok) {
        const target = result.url && result.url.length > 0 ? result.url : getCallbackUrl();
        window.location.href = target;
      }
    },
    onError: (error) => {
      if (error instanceof Error && error.message === "SUBSCRIPTION_INACTIVE") {
        window.location.href = "/subscription-expired";
        return;
      }
      if (error instanceof Error && error.message === "REQUIRES_MFA") {
        const vals = form.getValues();
        pendingCredentials.current = { email: vals.email, password: vals.password, rememberMe: vals.rememberMe ?? false };
        setMfaRequired(true);
        return;
      }
      toast.error(getErrorMessage(error));
    },
  });

  const mfaMutation = useMutation({
    mutationFn: async () => {
      const creds = pendingCredentials.current;
      if (!creds || !mfaCode) throw new Error("Missing credentials");
      return doSignIn(creds.email, creds.password, creds.rememberMe, mfaCode);
    },
    onSuccess: (result) => {
      toast.success("Welcome back!");
      if (result?.ok) {
        const target = result.url && result.url.length > 0 ? result.url : getCallbackUrl();
        window.location.href = target;
      }
    },
    onError: (error) => {
      if (error instanceof Error && error.message === "INVALID_MFA_CODE") {
        setMfaError("Invalid code. Check your authenticator app and try again.");
        setMfaCode("");
        return;
      }
      toast.error(getErrorMessage(error));
    },
  });

  const googleSignInMutation = useMutation({
    mutationFn: async () => {
      await signIn("google", { callbackUrl: getCallbackUrl() });
    },
    onError: () => {
      toast.error("Google sign-in failed. Please try again.");
    },
  });

  const handleResendVerification = useCallback(async () => {
    const email = form.getValues("email");
    if (!email) return;
    setIsResendingVerification(true);
    try {
      await apiClient.post("/auth/resend-verification", { email });
      toast.success("Verification email sent. Check your inbox.");
      setShowVerificationHint(false);
    } catch {
      toast.error("Failed to resend verification email.");
    } finally {
      setIsResendingVerification(false);
    }
  }, [form]);

  const isPending = signInMutation.isPending;
  const passwordStrength =
    passwordValue.length > 0 ? validatePasswordStrength(passwordValue) : null;

  const hasGoogleProvider = !!process.env.NEXT_PUBLIC_GOOGLE_ENABLED;
  const hasMicrosoftProvider = !!process.env.NEXT_PUBLIC_MICROSOFT_ENABLED;
  const hasOAuthProviders = hasGoogleProvider || hasMicrosoftProvider;

  const microsoftSignInMutation = useMutation({
    mutationFn: async () => {
      await signIn("microsoft-entra-id", { callbackUrl: getCallbackUrl() });
    },
    onError: () => {
      toast.error("Microsoft sign-in failed. Please try again.");
    },
  });

  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

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

  if (mfaRequired) {
    return (
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-5 sm:mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            Two-factor authentication
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        <div className="rounded-xl p-4 sm:p-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="totp-code" className="text-[13px] font-medium">
              Authentication code
            </Label>
            <Input
              id="totp-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={6}
              value={mfaCode}
              onChange={(e) => {
                setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                setMfaError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && mfaCode.length === 6) mfaMutation.mutate();
              }}
              disabled={mfaMutation.isPending}
              className={cn(
                "h-9 text-sm text-center tracking-[0.4em] font-mono",
                mfaError && "border-destructive focus-visible:ring-destructive/30",
              )}
              autoFocus
            />
            {mfaError && (
              <p role="alert" className="text-[12px] text-destructive">{mfaError}</p>
            )}
          </div>

          <Button
            type="button"
            disabled={mfaMutation.isPending || mfaCode.length !== 6}
            className="w-full h-9 text-sm font-medium gap-2"
            onClick={() => mfaMutation.mutate()}
          >
            {mfaMutation.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Verifying…
              </>
            ) : (
              <>
                Verify and sign in
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>

          <button
            type="button"
            onClick={() => { setMfaRequired(false); setMfaCode(""); setMfaError(null); pendingCredentials.current = null; }}
            className="block w-full text-center text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm animate-fade-up">
      <div className="mb-5 sm:mb-8 text-center">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          Sign in to your account
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter your credentials to continue
        </p>
      </div>

      {lockedSeconds !== null && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
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
              onClick={handleResendVerification}
              disabled={isResendingVerification}
            >
              {isResendingVerification ? "Sending…" : "Resend verification email"}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-4">
        <form
          onSubmit={form.handleSubmit((v) => signInMutation.mutate(v))}
          aria-busy={isPending}
          noValidate
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[13px] font-medium">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@streamlineos.in"
              {...form.register("email")}
              disabled={isPending}
              className={cn(
                "h-9 text-sm",
                form.formState.errors.email &&
                  "border-destructive focus-visible:ring-destructive/30",
              )}
              aria-invalid={!!form.formState.errors.email}
              aria-describedby={
                form.formState.errors.email ? "email-error" : undefined
              }
            />
            {form.formState.errors.email && (
              <p
                id="email-error"
                role="alert"
                className="text-[12px] text-destructive"
              >
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="grid">
              <Label
                htmlFor="password"
                className="row-start-1 col-start-1 self-center text-[13px] font-medium"
              >
                Password
              </Label>
              <div className="relative row-start-2 col-start-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...form.register("password", {
                    onChange: (e) => setPasswordValue(e.target.value),
                  })}
                  disabled={isPending}
                  className={cn(
                    "h-9 text-sm pr-9",
                    form.formState.errors.password &&
                      "border-destructive focus-visible:ring-destructive/30",
                  )}
                  aria-invalid={!!form.formState.errors.password}
                  aria-describedby={
                    form.formState.errors.password ? "pw-error" : undefined
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <Link
                href="/forgot-password"
                tabIndex={-1}
                className="row-start-1 col-start-1 justify-self-end self-center text-[12px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            {form.formState.errors.password && (
              <p
                id="pw-error"
                role="alert"
                className="text-[12px] text-destructive"
              >
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer group select-none">
            <input
              type="checkbox"
              {...form.register("rememberMe")}
              className="h-3.5 w-3.5 rounded border-border text-blue-600 accent-blue-600 cursor-pointer"
            />
            <span className="text-[12px] text-muted-foreground group-hover:text-foreground transition-colors">
              Remember me for 30 days
            </span>
          </label>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-9 text-sm font-medium gap-2 mt-1"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                Sign in
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </form>

        <div className="text-center">
          {!showMagicLink ? (
            <button
              type="button"
              onClick={() => setShowMagicLink(true)}
              className="text-[12px] text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
            >
              Email me a sign-in link instead
            </button>
          ) : magicLinkSent ? (
            <p className="text-[12px] text-green-700">
              Check your inbox — a sign-in link is on its way.
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                type="email"
                placeholder="you@company.com"
                value={magicLinkEmail}
                onChange={(e) => setMagicLinkEmail(e.target.value)}
                className="h-8 text-sm"
                autoFocus
              />
              <Button
                type="button"
                size="sm"
                className="h-8 shrink-0"
                disabled={!magicLinkEmail || magicLinkMutation.isPending}
                onClick={() => magicLinkMutation.mutate(magicLinkEmail)}
              >
                {magicLinkMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Send"}
              </Button>
            </div>
          )}
        </div>

        {hasOAuthProviders && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-2 text-[11px] text-muted-foreground/60">
                  or continue with
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {hasGoogleProvider && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-9 text-sm font-medium gap-2"
                  onClick={() => googleSignInMutation.mutate()}
                  disabled={googleSignInMutation.isPending || isPending}
                >
                  {googleSignInMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  )}
                  Continue with Google
                </Button>
              )}
              {hasMicrosoftProvider && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-9 text-sm font-medium gap-2"
                  onClick={() => microsoftSignInMutation.mutate()}
                  disabled={microsoftSignInMutation.isPending || isPending}
                >
                  {microsoftSignInMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 21 21" aria-hidden="true">
                      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                    </svg>
                  )}
                  Continue with Microsoft
                </Button>
              )}
            </div>
          </>
        )}

        <p className="text-sm text-center text-muted-foreground">
          Don&apos;t have an account?{" "}
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
