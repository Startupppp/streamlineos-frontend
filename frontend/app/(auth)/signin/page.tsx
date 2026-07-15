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
import { Loader2, Eye, EyeOff, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { apiClient } from "@/lib/api-client";
import { parseAuthErrorCode } from "@/lib/parse-auth-error";
import { MfaStep, MagicLinkForm, OAuthButtons, SignInAlerts, formatLockoutTime } from "@/features/auth";

export const dynamic = "force-dynamic";

const signinSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type FormValues = z.infer<typeof signinSchema>;

const RESEND_COOLDOWN_SECONDS = 60;

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [lockedSeconds, setLockedSeconds] = useState<number | null>(null);
  const [showVerificationHint, setShowVerificationHint] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const resendCooldownRef = useRef<NodeJS.Timeout | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState<string | null>(null);
  const pendingCredentials = useRef<{
    email: string;
    password: string;
    rememberMe: boolean;
  } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(signinSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

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
          "No account found with that identity. Please sign up first or use email and password.",
        OAuthSignin: "Could not start Google sign-in. Please try again.",
        OAuthCallback:
          "Google sign-in failed. Please try again or use email and password.",
        OAuthCreateAccount:
          "Account setup failed. Please use email and password instead.",
        OAuthAccountNotLinked:
          "This email is already registered. Sign in with your password, then link Google in settings.",
        Configuration:
          "Authentication is misconfigured. Please contact support.",
      };
      const message =
        oauthMessages[errorParam] ?? "Authentication failed. Please try again.";
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

  const doSignIn = async (
    email: string,
    password: string,
    rememberMe: boolean,
    totpCode?: string,
  ) => {
    if (!navigator.onLine)
      throw new Error(
        "No internet connection. Check your network and try again.",
      );
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
        const parsed = parseAuthErrorCode(result.error);
        if (parsed.code === "AUTH_ACCOUNT_LOCKED") {
          setLockedSeconds(parsed.retryAfterSeconds ?? null);
          throw new Error(
            `Account locked. Try again in ${formatLockoutTime(parsed.retryAfterSeconds ?? 900)}.`,
          );
        }
        if (parsed.code === "AUTH_SUBSCRIPTION_INACTIVE") throw new Error("AUTH_SUBSCRIPTION_INACTIVE");
        if (parsed.code === "AUTH_MFA_REQUIRED") throw new Error("AUTH_MFA_REQUIRED");
        if (parsed.code === "AUTH_INVALID_MFA_CODE") throw new Error("AUTH_INVALID_MFA_CODE");
        if (parsed.code === "AUTH_EMAIL_NOT_VERIFIED") {
          setShowVerificationHint(true);
          throw new Error(
            "Please verify your email before signing in. Check your inbox or resend the verification email below.",
          );
        }
        throw new Error("Invalid email or password.");
      }
      return result;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error(
          "No internet connection. Check your network and try again.",
        );
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
        const target =
          result.url && result.url.length > 0 ? result.url : getCallbackUrl();
        window.location.href = target;
      }
    },
    onError: (error) => {
      if (error instanceof Error && error.message === "AUTH_SUBSCRIPTION_INACTIVE") {
        window.location.href = "/subscription-expired";
        return;
      }
      if (error instanceof Error && error.message === "AUTH_MFA_REQUIRED") {
        const vals = form.getValues();
        pendingCredentials.current = {
          email: vals.email,
          password: vals.password,
          rememberMe: vals.rememberMe ?? false,
        };
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
        const target =
          result.url && result.url.length > 0 ? result.url : getCallbackUrl();
        window.location.href = target;
      }
    },
    onError: (error) => {
      if (error instanceof Error && error.message === "AUTH_INVALID_MFA_CODE") {
        setMfaError(
          "Invalid code. Check your authenticator app and try again.",
        );
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
    const email = form.getValues("email")?.trim();
    if (!email) {
      toast.error("Enter your email address above first.");
      return;
    }
    if (resendCooldown > 0) return;
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
  }, [form, resendCooldown, startResendCooldown]);

  const isPending = signInMutation.isPending;

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

  const handleTogglePassword = useCallback(() => setShowPassword((v) => !v), []);
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
    if (e.key === "Enter" && mfaCode.length === 6) mfaMutation.mutate();
  }, [mfaCode, mfaMutation]);
  const handleMfaSubmit = useCallback(() => mfaMutation.mutate(), [mfaMutation]);
  const handleMfaBack = useCallback(() => {
    setMfaRequired(false);
    setMfaCode("");
    setMfaError(null);
    pendingCredentials.current = null;
  }, []);

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
          Enter your credentials to continue
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
        <form
          onSubmit={form.handleSubmit((v) => signInMutation.mutate(v))}
          aria-busy={isPending}
          noValidate
          className="space-y-3"
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
                "h-8 text-sm",
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
                  {...form.register("password")}
                  disabled={isPending}
                  className={cn(
                    "h-8 text-sm pr-9",
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
                  onClick={handleTogglePassword}
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
            isSignInPending={isPending}
            onGoogleSignIn={handleGoogleSignIn}
            onMicrosoftSignIn={handleMicrosoftSignIn}
          />
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
