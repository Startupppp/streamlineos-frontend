"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn } from "next-auth/react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { PRICING_TIERS } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z
    .string()
    .min(8, "Minimum 8 characters")
    .regex(/[A-Z]/, "Must include an uppercase letter")
    .regex(/[a-z]/, "Must include a lowercase letter")
    .regex(/[0-9]/, "Must include a number")
    .regex(/[^A-Za-z0-9]/, "Must include a special character"),
  companyName: z.string().min(1, "Company name is required"),
  phone: z.string().optional(),
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

export default function SignupPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTier, setSelectedTier] = useState<TierId>("startup");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      companyName: "",
      phone: "",
    },
  });

  const handleSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      await apiClient.post("/auth/signup", { ...data, plan: TIER_TO_API_PLAN[selectedTier] });
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
  };

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
              8+ chars · upper · lower · number · symbol
            </p>
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
