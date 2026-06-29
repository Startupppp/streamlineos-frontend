"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Loader2,
  Eye,
  EyeOff,
  ArrowRight,
  Check,
  Sparkles,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { PRICING_TIERS } from "@/lib/pricing";
import { signIn } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";

export const dynamic = "force-dynamic";

const signupSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Please enter a valid email"),
    password: z
      .string()
      .min(12, "Minimum 12 characters")
      .regex(/[A-Z]/, "Must include an uppercase letter")
      .regex(/[a-z]/, "Must include a lowercase letter")
      .regex(/[0-9]/, "Must include a number")
      .regex(/[^A-Za-z0-9]/, "Must include a special character"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    companyName: z.string().min(1, "Company name is required"),
    phone: z.string().optional(),
    terms: z
      .boolean()
      .refine((v) => v === true, { message: "You must accept the terms" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof signupSchema>;

type TierId = (typeof PRICING_TIERS)[number]["id"];
type ApiPlan = "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

const TIER_TO_API_PLAN: Record<TierId, ApiPlan> = {
  starter: "STARTER",
  startup: "STARTER",
  growth: "PROFESSIONAL",
  enterprise: "ENTERPRISE",
};

const hasGoogleProvider = !!process.env.NEXT_PUBLIC_GOOGLE_ENABLED;

export default function SignupPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTier, setSelectedTier] = useState<TierId>("startup");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      companyName: "",
      phone: "",
      terms: false,
    },
  });

  const handleSubmit = useCallback(
    async (data: FormValues) => {
      setIsSubmitting(true);
      try {
        await apiClient.post("/auth/register", {
          ...data,
          plan: TIER_TO_API_PLAN[selectedTier],
        });
        toast.success("Account created! Signing you in…");

        const result = await signIn("credentials", {
          email: data.email,
          password: data.password,
          redirect: false,
        });

        if (result?.ok) {
          window.location.href = "/org-setup";
        } else {
          toast.error(
            "Account created but auto-login failed. Please sign in manually.",
          );
          window.location.href = "/signin";
        }
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setIsSubmitting(false);
      }
    },
    [selectedTier],
  );

  const handleResendVerification = useCallback(async () => {
    if (!registeredEmail) return;
    setIsResending(true);
    try {
      await apiClient.post("/auth/resend-verification", {
        email: registeredEmail,
      });
      toast.success("Verification email resent.");
    } catch {
      toast.error("Failed to resend. Please try again.");
    } finally {
      setIsResending(false);
    }
  }, [registeredEmail]);

  if (registeredEmail) {
    return (
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
          <Mail className="h-7 w-7 text-blue-600" />
        </div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900">
          Verify your email
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          We sent a verification link to{" "}
          <span className="font-semibold text-slate-900">
            {registeredEmail}
          </span>
          . Click it to activate your account and sign in.
        </p>
        <div className="mt-6 space-y-3">
          <Button
            onClick={handleResendVerification}
            disabled={isResending}
            variant="outline"
            className="w-full h-10"
          >
            {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Resend verification email
          </Button>
          <p className="text-sm text-slate-500">
            Already verified?{" "}
            <Link
              href="/signin"
              className="font-semibold text-blue-600 hover:text-blue-700"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md text-left scrollbar-hide">
      <div className="mb-5 text-center">
        <h1 className="font-display text-2xl sm:text-[1.7rem] font-extrabold tracking-[-0.02em] text-slate-900 leading-tight">
          Create your account
        </h1>
        <p className="text-[13px] text-slate-500 mt-1">
          {step === 1
            ? "Pick a plan — switch anytime."
            : "A few details and you're in."}
        </p>
      </div>

      {step === 1 ? (
        <div className="space-y-3">
          <div role="radiogroup" aria-label="Plan" className="space-y-2">
            {PRICING_TIERS.map((plan) => {
              const isSelected = selectedTier === plan.id;
              const shortFeatures = plan.features.slice(0, 2);
              return (
                <button
                  key={plan.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelectedTier(plan.id)}
                  className={cn(
                    "relative w-full text-left rounded-xl border px-4 py-3 transition-all duration-200 flex items-center gap-3",
                    isSelected
                      ? "border-blue-500/70 bg-white shadow-[0_10px_28px_-12px_rgba(30,64,175,0.22)]"
                      : "border-slate-200 bg-white/70 hover:border-blue-300/70 hover:bg-white",
                  )}
                >
                  <span
                    className={cn(
                      "h-5 w-5 rounded-full border-2 inline-flex items-center justify-center shrink-0 transition-colors",
                      isSelected
                        ? "border-blue-500 bg-blue-500"
                        : "border-slate-300 bg-white",
                    )}
                  >
                    {isSelected && (
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap mb-0.5">
                      <span className="font-display text-[15px] font-bold text-slate-900">
                        {plan.name}
                      </span>
                      <span className="text-[15px] font-extrabold text-blue-600">
                        {plan.price}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 truncate">
                        {plan.period}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      {shortFeatures.map((f) => (
                        <span
                          key={f}
                          className="text-[11px] text-slate-600 inline-flex items-center gap-1"
                        >
                          <Check
                            className="h-2.5 w-2.5 text-blue-500 shrink-0"
                            strokeWidth={3}
                          />
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>

                  {plan.highlight && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-2 py-0.5 text-[9px] font-semibold text-white shadow-sm shrink-0">
                      <Sparkles className="h-2.5 w-2.5" />
                      Popular
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-[11px] font-medium text-slate-400 text-center pt-1">
            14-day trial · No credit card · Cancel anytime
          </p>

          <Button onClick={() => setStep(2)} className="w-full h-11">
            Continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          {hasGoogleProvider && (
            <>
              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-2 text-[11px] text-slate-400">
                    or
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 text-sm font-medium gap-2 border-slate-200"
                onClick={() => googleSignUpMutation.mutate()}
                disabled={googleSignUpMutation.isPending}
              >
                {googleSignUpMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
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
            </>
          )}

          <p className="text-[13px] text-center text-slate-500 mt-2">
            Already have an account?{" "}
            <Link
              href="/signin"
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Sign in
            </Link>
          </p>
        </div>
      ) : (
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-3.5"
        >
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-[12px] font-medium text-slate-700">
                First name
              </Label>
              <Input
                {...form.register("firstName")}
                placeholder="Aditya"
                className="h-10"
              />
              {form.formState.errors.firstName && (
                <p className="text-[11px] text-red-600">
                  {form.formState.errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-[12px] font-medium text-slate-700">
                Last name
              </Label>
              <Input
                {...form.register("lastName")}
                placeholder="Sharma"
                className="h-10"
              />
              {form.formState.errors.lastName && (
                <p className="text-[11px] text-red-600">
                  {form.formState.errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[12px] font-medium text-slate-700">
              Company
            </Label>
            <Input
              {...form.register("companyName")}
              placeholder="Acme Inc."
              className="h-10"
            />
            {form.formState.errors.companyName && (
              <p className="text-[11px] text-red-600">
                {form.formState.errors.companyName.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-[12px] font-medium text-slate-700">
              Work email
            </Label>
            <Input
              {...form.register("email")}
              type="email"
              placeholder="you@company.com"
              className="h-10"
            />
            {form.formState.errors.email && (
              <p className="text-[11px] text-red-600">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-[12px] font-medium text-slate-700">
              Password
            </Label>
            <div className="relative">
              <Input
                {...form.register("password")}
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                className="h-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {form.formState.errors.password && (
              <p className="text-[11px] text-red-600">
                {form.formState.errors.password.message}
              </p>
            )}
            <p className="text-[10px] text-slate-400 mt-0.5">
              12+ chars · upper · lower · number · symbol
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-[12px] font-medium text-slate-700">
              Confirm password
            </Label>
            <div className="relative">
              <Input
                {...form.register("confirmPassword")}
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Repeat your password"
                className="h-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {form.formState.errors.confirmPassword && (
              <p className="text-[11px] text-red-600">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-1 pt-0.5">
            <label className="flex items-start gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                {...form.register("terms")}
                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
              />
              <span className="text-[12px] text-slate-500 leading-relaxed">
                I agree to the{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Privacy Policy
                </Link>
              </span>
            </label>
            {form.formState.errors.terms && (
              <p className="text-[11px] text-red-600">
                {form.formState.errors.terms.message}
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              className="flex-1 h-11 border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-11"
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {isSubmitting ? "Creating…" : "Start free trial"}
            </Button>
          </div>

          <p className="text-[13px] text-center text-slate-500 pt-1">
            Already have an account?{" "}
            <Link
              href="/signin"
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Sign in
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
