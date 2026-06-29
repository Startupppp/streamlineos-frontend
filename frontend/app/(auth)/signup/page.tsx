"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { signIn } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";

export const dynamic = "force-dynamic";

const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z
    .string()
    .min(12, "Minimum 12 characters")
    .regex(/[A-Z]/, "Must include an uppercase letter")
    .regex(/[a-z]/, "Must include a lowercase letter")
    .regex(/[0-9]/, "Must include a number")
    .regex(/[^A-Za-z0-9]/, "Must include a special character"),
  companyName: z.string().min(1, "Company name is required"),
  terms: z
    .boolean()
    .refine((v) => v === true, { message: "You must accept the terms" }),
});

type FormValues = z.infer<typeof signupSchema>;

const hasGoogleProvider = !!process.env.NEXT_PUBLIC_GOOGLE_ENABLED;

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const googleSignUpMutation = useMutation({
    mutationFn: async () => {
      await signIn("google", { callbackUrl: "/org-setup" });
    },
    onError: () => {
      toast.error("Google sign-up failed. Please try again.");
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      email: "",
      password: "",
      companyName: "",
      terms: false,
    },
  });

  const watchedEmail = form.watch("email");
  useEffect(() => {
    const username = watchedEmail.split("@")[0].replace(/[^a-zA-Z]/g, " ").trim();
    const capitalized = username.charAt(0).toUpperCase() + username.slice(1);
    if (capitalized && !form.formState.dirtyFields.firstName) {
      form.setValue("firstName", capitalized, { shouldValidate: false });
    }
  }, [watchedEmail, form]);

  const handleSubmit = useCallback(async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const parts = data.firstName.trim().split(/\s+/);
      const firstName = parts[0];
      const lastName = parts.length > 1 ? parts.slice(1).join(" ") : parts[0];
      await apiClient.post("/auth/register", { ...data, firstName, lastName, plan: "STARTER" });
      toast.success("Account created! Signing you in…");

      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.ok) {
        window.location.href = "/org-setup";
      } else {
        setRegisteredEmail(data.email);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const handleResendVerification = useCallback(async () => {
    if (!registeredEmail) return;
    setIsResending(true);
    try {
      await apiClient.post("/auth/resend-verification", { email: registeredEmail });
      toast.success("Verification email resent.");
    } catch {
      toast.error("Failed to resend. Please try again.");
    } finally {
      setIsResending(false);
    }
  }, [registeredEmail]);

  if (registeredEmail) {
    return (
      <div className="w-full max-w-sm text-center animate-fade-up my-auto">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
          <Mail className="h-7 w-7 text-blue-600" />
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          Check your email
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          We sent a verification link to{" "}
          <span className="font-semibold text-foreground">{registeredEmail}</span>.
          Click it to activate your account.
        </p>
        <div className="mt-6 space-y-3">
          <Button
            onClick={handleResendVerification}
            disabled={isResending}
            variant="outline"
            className="w-full h-9 text-sm"
          >
            {isResending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Resend verification email
          </Button>
          <p className="text-sm text-muted-foreground">
            Already verified?{" "}
            <Link href="/signin" className="text-blue-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full min-h-0 max-w-lg flex-1 flex-col animate-fade-up sm:max-w-xl">
      <div className="shrink-0 mb-2 text-center">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          14-day free trial · No credit card required
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="space-y-3 pb-3">
            {hasGoogleProvider && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-9 text-sm font-medium gap-2"
                  onClick={() => googleSignUpMutation.mutate()}
                  disabled={googleSignUpMutation.isPending}
                >
                  {googleSignUpMutation.isPending ? (
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

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-background px-2 text-[11px] text-muted-foreground/60">
                      or continue with
                    </span>
                  </div>
                </div>
              </>
            )}

            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-[13px] font-medium">
                  Your name
                </Label>
                <Input
                  id="firstName"
                  {...form.register("firstName")}
                  placeholder="Aditya"
                  disabled={isSubmitting}
                  className={cn(
                    "h-9 text-sm",
                    form.formState.errors.firstName && "border-destructive focus-visible:ring-destructive/30",
                  )}
                />
                {form.formState.errors.firstName && (
                  <p className="text-[12px] text-destructive">{form.formState.errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="companyName" className="text-[13px] font-medium">
                  Company
                </Label>
                <Input
                  id="companyName"
                  {...form.register("companyName")}
                  placeholder="Acme Inc."
                  disabled={isSubmitting}
                  className={cn(
                    "h-9 text-sm",
                    form.formState.errors.companyName && "border-destructive focus-visible:ring-destructive/30",
                  )}
                />
                {form.formState.errors.companyName && (
                  <p className="text-[12px] text-destructive">{form.formState.errors.companyName.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[13px] font-medium">
                  Work email
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...form.register("email")}
                  placeholder="you@company.com"
                  disabled={isSubmitting}
                  className={cn(
                    "h-9 text-sm",
                    form.formState.errors.email && "border-destructive focus-visible:ring-destructive/30",
                  )}
                />
                {form.formState.errors.email && (
                  <p className="text-[12px] text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[13px] font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    {...form.register("password")}
                    placeholder="Create a strong password"
                    disabled={isSubmitting}
                    className={cn(
                      "h-9 text-sm pr-9",
                      form.formState.errors.password && "border-destructive focus-visible:ring-destructive/30",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {form.formState.errors.password ? (
                  <p className="text-[12px] text-destructive">{form.formState.errors.password.message}</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground/60">
                    12+ chars · upper · lower · number · symbol
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="flex items-start gap-2.5 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    {...form.register("terms")}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-border text-blue-600 accent-blue-600 cursor-pointer"
                  />
                  <span className="text-[12px] text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
                    I agree to the{" "}
                    <Link href="/terms" target="_blank" className="text-blue-600 hover:underline font-medium">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" target="_blank" className="text-blue-600 hover:underline font-medium">
                      Privacy Policy
                    </Link>
                  </span>
                </label>
                {form.formState.errors.terms && (
                  <p className="text-[12px] text-destructive">{form.formState.errors.terms.message}</p>
                )}
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full h-9 text-sm font-medium">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                    Creating account…
                  </>
                ) : (
                  "Start free trial"
                )}
              </Button>
            </form>

            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{" "}
              <Link href="/signin" className="text-blue-600 hover:underline font-medium">
                Sign in
              </Link>
            </p>

            <p className="text-[11px] text-muted-foreground/50 text-center leading-relaxed">
              Encrypted in transit over TLS. Sessions are signed and rotated.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
