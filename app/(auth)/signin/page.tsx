"use client";

import { useState, useEffect } from "react";
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
import { Loader2, Eye, EyeOff, ArrowRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { validatePasswordStrength } from "@/lib/utils/password-validation";
import { getErrorMessage } from "@/lib/get-error-message";

export const dynamic = "force-dynamic";

const signinSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
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

  const form = useForm<FormValues>({
    resolver: zodResolver(signinSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get("error");
      if (errorParam?.startsWith("ACCOUNT_LOCKED:")) {
        const secs = parseInt(errorParam.split(":")[1] ?? "0", 10);
        setLockedSeconds(isNaN(secs) ? null : secs);
      }
    }
  }, []);

  const getCallbackUrl = () => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const url = params.get("callbackUrl");
      if (url && url.startsWith("/")) return url;
    }
    return "/dashboard";
  };

  const signInMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (!navigator.onLine) {
        throw new Error(
          "No internet connection. Check your network and try again.",
        );
      }
      try {
        const result = await signIn("credentials", {
          email: data.email,
          password: data.password,
          callbackUrl: getCallbackUrl(),
          redirect: false,
        });
        if (result?.error) {
          if (result.error.startsWith("ACCOUNT_LOCKED:")) {
            const secs = parseInt(result.error.split(":")[1] ?? "0", 10);
            setLockedSeconds(isNaN(secs) ? null : secs);
            throw new Error(
              `Account locked. Try again in ${formatLockoutTime(isNaN(secs) ? 900 : secs)}.`,
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

  const isPending = signInMutation.isPending;
  const passwordStrength =
    passwordValue.length > 0 ? validatePasswordStrength(passwordValue) : null;

  const hasGoogleProvider = !!process.env.NEXT_PUBLIC_GOOGLE_ENABLED;

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
              placeholder="you@streamlineos.app"
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-[13px] font-medium">
                Password
              </Label>
              <Link
                href="/forgot-password"
                className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
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
            {form.formState.errors.password && (
              <p
                id="pw-error"
                role="alert"
                className="text-[12px] text-destructive"
              >
                {form.formState.errors.password.message}
              </p>
            )}
            {passwordStrength && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[20, 40, 60, 80, 100].map((threshold) => (
                    <div
                      key={threshold}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-colors",
                        passwordStrength.score >= threshold
                          ? passwordStrength.score >= 80
                            ? "bg-green-500"
                            : passwordStrength.score >= 60
                              ? "bg-yellow-500"
                              : "bg-destructive"
                          : "bg-muted",
                      )}
                    />
                  ))}
                </div>
                {passwordStrength.missing.length > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    {passwordStrength.missing[0]}
                  </p>
                )}
              </div>
            )}
          </div>

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

        {hasGoogleProvider && (
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
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              Continue with Google
            </Button>
          </>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-card px-2 text-[11px] text-muted-foreground/60">
              Secure sign-in
            </span>
          </div>
        </div>

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
          Your session is protected with end-to-end encryption.
        </p>
      </div>
    </div>
  );
}
