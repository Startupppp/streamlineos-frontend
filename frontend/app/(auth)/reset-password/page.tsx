"use client";

import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { resetPassword } from "@/server/actions/auth-actions";
import { useResetPassword } from "@/hooks/auth-hooks";
import { Loader2, Rocket, Shield, Eye, EyeOff, ArrowRight, ArrowLeft, AlertCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { PASSWORD_REGEX } from "@/lib/password-utils";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";

const formSchema = z
  .object({
    password: z
      .string()
      .min(12, "Password must be at least 12 characters")
      .max(128, "Password must be at most 128 characters")
      .regex(
        PASSWORD_REGEX,
        "Must include uppercase, lowercase, number, and special character"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[@$!%*?&]/.test(password)) score++;

  if (score <= 2) return { score: 1, label: "Weak", color: "bg-red-500" };
  if (score <= 4) return { score: 2, label: "Medium", color: "bg-yellow-500" };
  if (score <= 5) return { score: 3, label: "Strong", color: "bg-green-500" };
  return { score: 4, label: "Very Strong", color: "bg-emerald-500" };
}

function PasswordStrengthBar({ password }: { password: string }) {
  const strength = getPasswordStrength(password);
  return (
    <div className="space-y-1 mt-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              level <= strength.score ? strength.color : "bg-muted"
            )}
          />
        ))}
      </div>
      <p
        className={cn(
          "text-[11px]",
          strength.score <= 1
            ? "text-red-500"
            : strength.score <= 2
              ? "text-yellow-500"
              : "text-green-500"
        )}
      >
        {strength.label}
      </p>
    </div>
  );
}

function PasswordFields({ control, watch }: { control: ReturnType<typeof useForm<FormValues>>["control"]; watch: ReturnType<typeof useForm<FormValues>>["watch"] }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const password = watch("password");

  const handleTogglePassword = () => setShowPassword((v) => !v);
  const handleToggleConfirmPassword = () => setShowConfirmPassword((v) => !v);

  return (
    <>
      <FormField
        control={control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-[13px] font-medium">New Password</FormLabel>
            <FormControl>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="8+ characters"
                  className="pl-9 pr-9 h-9 text-sm"
                  {...field}
                />
                <button
                  type="button"
                  onClick={handleTogglePassword}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormControl>
            {password && <PasswordStrengthBar password={password} />}
            <FormMessage className="text-[12px]" />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="confirmPassword"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-[13px] font-medium">Confirm Password</FormLabel>
            <FormControl>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  className="pl-9 pr-9 h-9 text-sm"
                  {...field}
                />
                <button
                  type="button"
                  onClick={handleToggleConfirmPassword}
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormControl>
            <FormMessage className="text-[12px]" />
          </FormItem>
        )}
      />
    </>
  );
}

function TokenResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [done, setDone] = useState(false);
  const resetPasswordMutation = useResetPassword();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: FormValues) {
    try {
      await resetPasswordMutation.mutateAsync({ token, password: values.password });
      setDone(true);
      toast.success("Password reset successfully!");
      setTimeout(() => router.push("/signin"), 2000);
    } catch (error) {
      toast.error(getErrorMessage(error) || "Failed to reset password. The link may have expired.");
    }
  }

  if (done) {
    return (
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-5 sm:mb-8">
          <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
            <Shield className="h-5 w-5 text-green-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            Password Reset
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Your password has been reset successfully. Redirecting to sign in...
          </p>
        </div>
        <Link href="/signin">
          <Button className="w-full h-9 text-sm font-medium">
            <ArrowLeft className="h-3.5 w-3.5 mr-2" />
            Go to Sign In
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm animate-fade-up">
      <div className="mb-5 sm:mb-8">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          Reset Your Password
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Create a new secure password for your account.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-soft p-4 sm:p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <PasswordFields control={form.control} watch={form.watch} />
            <Button
              type="submit"
              disabled={resetPasswordMutation.isPending}
              className="w-full h-9 text-sm font-medium gap-2 mt-1"
            >
              {resetPasswordMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  Reset Password
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </form>
        </Form>

        <div className="mt-4 text-center">
          <Link
            href="/signin"
            className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

function ForceChangePasswordForm() {
  const { update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const result = await resetPassword(values.password);
      if (result.success) {
        toast.success("Password updated successfully!");
        await update({ forceChangePassword: false });
        await new Promise((resolve) => setTimeout(resolve, 300));
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to update password");
      }
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm animate-fade-up">
      <div className="mb-5 sm:mb-8">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
          <Rocket className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          Set up your password
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Create a secure password to complete your account setup.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-soft p-4 sm:p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <PasswordFields control={form.control} watch={form.watch} />
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-9 text-sm font-medium gap-2 mt-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  Complete Setup
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

function InvalidTokenState() {
  return (
    <div className="w-full max-w-sm animate-fade-up">
      <div className="mb-5 sm:mb-8">
        <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
          <AlertCircle className="h-5 w-5 text-destructive" />
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          Invalid Reset Link
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          This password reset link is invalid or has expired. Please request a new one.
        </p>
      </div>
      <Link href="/forgot-password">
        <Button className="w-full h-9 text-sm font-medium">
          Request New Reset Link
        </Button>
      </Link>
    </div>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  if (token) {
    if (token.length < 10) {
      return <InvalidTokenState />;
    }
    return <TokenResetForm token={token} />;
  }

  return <ForceChangePasswordForm />;
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-sm">
        <div className="h-10 w-10 rounded-xl bg-muted animate-pulse mb-4" />
        <div className="h-6 bg-muted rounded animate-pulse mb-2" />
        <div className="h-4 bg-muted/60 rounded animate-pulse mb-6 w-3/4" />
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="h-9 bg-muted rounded animate-pulse" />
          <div className="h-9 bg-muted rounded animate-pulse" />
          <div className="h-9 bg-muted rounded animate-pulse" />
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
