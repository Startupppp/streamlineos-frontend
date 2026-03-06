"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useResetPassword } from "@/lib/hooks/auth-hooks";
import { getPasswordStrength, PASSWORD_REGEX } from "@/lib/password-utils";
import { PasswordStrengthIndicator } from "@/components/auth/password-strength-indicator";
import { PasswordConfirmField } from "@/components/auth/password-confirm-field";
import { Loader2, KeyRound, ArrowLeft, Eye, EyeOff, CheckCircle2, Lock, ArrowRight } from "lucide-react";

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(PASSWORD_REGEX, "Must include uppercase, lowercase, number, and special character"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const password = form.watch("password");
  const confirmPassword = form.watch("confirmPassword");
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  useEffect(() => {
    if (!token) {
      toast.error("Invalid reset link");
      router.push("/forgot-password");
    }
  }, [token, router]);

  const resetPassword = useResetPassword({
    onSuccess: () => {
      setIsSuccess(true);
      toast.success("Password reset successfully!");
      setTimeout(() => router.push("/signin"), 2000);
    },
    onError: (error) => {
      toast.error(error.message || "An error occurred");
    },
  });

  const onSubmit = (values: ResetPasswordFormValues) => {
    if (!token) {
      toast.error("Invalid reset token");
      return;
    }
    resetPassword.mutate({ token, password: values.password });
  };

  if (!token) return null;

  if (isSuccess) {
    return (
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto bg-green-500/15 p-4 rounded-full w-fit mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Password Reset!</h1>
          <p className="text-muted-foreground mt-2">Your password has been successfully reset</p>
        </div>

        <Card className="shadow-noir border-border">
          <CardContent className="pt-6 space-y-4">
            <div role="status" aria-live="polite" className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <p className="text-sm text-green-600">Redirecting you to sign in page...</p>
            </div>
            <Link href="/signin" className="block">
              <Button className="w-full">Go to Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
          <KeyRound className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Reset Password</h1>
        <p className="text-muted-foreground mt-2">Please enter your new password below to secure your account.</p>
      </div>

      <Card className="shadow-noir border-border">
        <CardContent className="pt-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" aria-busy={resetPassword.isPending}>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  {...form.register("password")}
                  disabled={resetPassword.isPending}
                  className="pl-10 pr-10 focus-visible:ring-primary"
                  aria-invalid={!!form.formState.errors.password}
                  aria-describedby={form.formState.errors.password ? "reset-password-error" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={0}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p id="reset-password-error" role="alert" className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
              {password.length > 0 && <PasswordStrengthIndicator strength={strength} />}
            </div>

            <PasswordConfirmField
              value={confirmPassword}
              onChange={(val) => form.setValue("confirmPassword", val, { shouldDirty: true })}
              password={password}
              disabled={resetPassword.isPending}
              showIcon
              label="Confirm New Password"
            />

            <Button type="submit" className="w-full" disabled={resetPassword.isPending}>
              {resetPassword.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  Update Password
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/signin" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="w-full max-w-md">
      <Card className="shadow-noir border-border">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingCard />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
