"use client";

import { useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { PASSWORD_REGEX, getPasswordStrength } from "@/lib/password-utils";
import { PasswordStrengthIndicator } from "@/components/auth/password-strength-indicator";
import { PasswordInput } from "@/components/auth/password-input";
import { Loader2, ArrowRight, Rocket, AlertCircle } from "lucide-react";
import Link from "next/link";
import { getErrorMessage } from "@/lib/get-error-message";

export const dynamic = "force-dynamic";

const setupSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const password = form.watch("password");
  const strength = useMemo(() => (password ? getPasswordStrength(password) : null), [password]);

  const { data: tokenInfo, isLoading: isValidating, error: tokenError } = useQuery({
    queryKey: ["setup-password", token],
    queryFn: () => apiClient.get<{ email: string; name: string }>("/auth/validate-setup-token", { token }),
    enabled: !!token,
    retry: false,
  });

  const handleSubmit = useCallback(async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      await apiClient.post("/auth/reset-password", {
        token,
        password: values.password,
      });
      toast.success("Password set successfully! You can now sign in.");
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
        <Loader2 className="h-8 w-8 animate-spin text-gold mx-auto mb-4" />
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
        <div className="h-10 w-10 rounded-xl bg-gold/10 flex items-center justify-center mb-4">
          <Rocket className="h-5 w-5 text-gold" />
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
            <Label htmlFor="password" className="text-[13px] font-medium">
              Password
            </Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder="Create a strong password"
              className="h-9 text-sm"
              aria-invalid={!!form.formState.errors.password}
              {...form.register("password")}
            />
            {strength && <PasswordStrengthIndicator strength={strength} />}
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-[13px] font-medium">
              Confirm Password
            </Label>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              placeholder="Confirm your password"
              className="h-9 text-sm"
              aria-invalid={!!form.formState.errors.confirmPassword}
              {...form.register("confirmPassword")}
            />
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
    <Suspense
      fallback={
        <div className="w-full max-w-sm text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gold mx-auto" />
        </div>
      }
    >
      <SetupPasswordContent />
    </Suspense>
  );
}
