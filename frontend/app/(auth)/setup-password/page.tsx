"use client";

import { useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiClient, clearBackendTokenCache } from "@/lib/api-client";
import { PASSWORD_REGEX, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, getPasswordStrength } from "@/lib/password-utils";
import { PasswordStrengthIndicator } from "@/components/auth/password-strength-indicator";
import { Loader2, Eye, EyeOff, ArrowRight, Shield, Rocket, AlertCircle } from "lucide-react";
import Link from "next/link";
import { getErrorMessage } from "@/lib/get-error-message";
import { signOut } from "next-auth/react";


export const dynamic = "force-dynamic";

const setupSchema = z
  .object({
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
      .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters`)
      .regex(PASSWORD_REGEX, "Must include uppercase, lowercase, number, and special character"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof setupSchema>;

function SetupPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const password = form.watch("password");
  const strength = useMemo(() => (password ? getPasswordStrength(password) : null), [password]);

  const { data: tokenInfo, isLoading: isValidating, error: tokenError } = useQuery({
    queryKey: ["setup-password", token],
    queryFn: () => apiClient.get<{ email: string; name: string }>("/organization/setup-token/validate", { token }),
    enabled: !!token,
    retry: false,
  });

  const handleTogglePassword = useCallback(() => setShowPassword((v) => !v), []);
  const handleToggleConfirm = useCallback(() => setShowConfirm((v) => !v), []);

  const handleSubmit = useCallback(async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      await apiClient.post("/auth/reset-password", {
        token,
        newPassword: values.password,
      });
      toast.success("Password set successfully! You can now sign in.");
      await apiClient.post("/auth/logout", undefined).catch(() => {});
      clearBackendTokenCache();
      await signOut({ redirect: false });
      router.push("/signin");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [token, router]);

  if (!token) {
    return (
      <div className="w-full max-w-sm text-center">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h1 className="text-xl font-semibold mb-2">Invalid Link</h1>
        <p className="text-sm text-muted-foreground mb-4">
          This setup link is invalid. Please contact your HR administrator.
        </p>
        <Button asChild variant="outline">
          <Link href="/signin">Go to Sign In</Link>
        </Button>
      </div>
    );
  }

  if (isValidating) {
    return (
      <div className="w-full max-w-sm text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Verifying your setup link...</p>
      </div>
    );
  }

  if (tokenError || !tokenInfo) {
    return (
      <div className="w-full max-w-sm text-center">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h1 className="text-xl font-semibold mb-2">Link Expired</h1>
        <p className="text-sm text-muted-foreground mb-4">
          This setup link has expired or is no longer valid. Please contact your HR administrator to get a new link.
        </p>
        <Button asChild variant="outline">
          <Link href="/signin">Go to Sign In</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6">
        <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
          <Rocket className="h-5 w-5 text-blue-600" />
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
          Welcome, {tokenInfo.name}!
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Set up your password to complete your account for <strong>{tokenInfo.email}</strong>.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-soft p-4 sm:p-6">
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium">Password</Label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                className="pl-9 pr-9 h-9 text-sm"
                {...form.register("password")}
              />
              <button
                type="button"
                onClick={handleTogglePassword}
                tabIndex={-1}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {strength && <PasswordStrengthIndicator strength={strength} />}
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium">Confirm Password</Label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm your password"
                className="pl-9 pr-9 h-9 text-sm"
                {...form.register("confirmPassword")}
              />
              <button
                type="button"
                onClick={handleToggleConfirm}
                tabIndex={-1}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {form.formState.errors.confirmPassword && (
              <p className="text-xs text-destructive">{form.formState.errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full h-9 text-sm font-medium gap-2">
            {isSubmitting ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Setting up...</>
            ) : (
              <><ArrowRight className="h-3.5 w-3.5" /> Complete Setup</>
            )}
          </Button>
        </form>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4">
        8+ characters with uppercase, lowercase, number, and special character required.
      </p>
    </div>
  );
}

export default function SetupPasswordPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-sm text-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" /></div>}>
      <SetupPasswordContent />
    </Suspense>
  );
}
