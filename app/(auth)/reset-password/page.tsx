"use client";

import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/auth/password-input";
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
import { Loader2, Rocket, ArrowRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { PASSWORD_REGEX } from "@/lib/password-utils";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

const formSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
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

function ResetPasswordContent() {
  const { update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [loading, setLoading] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const password = form.watch("password");
  const strength = password ? getPasswordStrength(password) : null;

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      if (token) {
        // Token-based unauthenticated reset password (from forgot password email link)
        const result = await apiClient.post<{ success: boolean; error?: string }>("/auth/reset-password", {
          token,
          password: values.password,
        });
        if (result.success) {
          toast.success("Password updated successfully!");
          await new Promise((resolve) => setTimeout(resolve, 500));
          router.push("/signin");
          router.refresh();
        } else {
          toast.error(result.error ?? "Failed to update password");
        }
      } else {
        // Authenticated forced password change (upon first login / flag set)
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
      }
    } catch (error: any) {
      toast.error(error?.message || "An error occurred. Please try again.");
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
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[13px] font-medium">New Password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      autoComplete="new-password"
                      placeholder="8+ characters"
                      className="h-9 text-sm"
                      {...field}
                    />
                  </FormControl>
                  {strength && (
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
                  )}
                  <FormMessage className="text-[12px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[13px] font-medium">Confirm Password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      autoComplete="new-password"
                      placeholder="Confirm your password"
                      className="h-9 text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[12px]" />
                </FormItem>
              )}
            />

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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-sm text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gold mx-auto" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
