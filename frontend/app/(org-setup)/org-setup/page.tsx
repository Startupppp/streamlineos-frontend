"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Loader2, CheckCircle2, Building2, User } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { ConfettiOverlay } from "@/features/crm/deals/confetti-overlay";

export const dynamic = "force-dynamic";

const INDUSTRIES = [
  "Technology",
  "Finance & Banking",
  "Healthcare",
  "Retail & E-commerce",
  "Manufacturing",
  "Education",
  "Real Estate",
  "Logistics & Supply Chain",
  "Marketing & Advertising",
  "Consulting",
  "Legal",
  "Media & Entertainment",
  "Hospitality & Travel",
  "Non-profit",
  "Other",
] as const;

const COMPANY_SIZES = [
  { value: "1-10", label: "1–10 employees" },
  { value: "11-50", label: "11–50 employees" },
  { value: "51-200", label: "51–200 employees" },
  { value: "201-500", label: "201–500 employees" },
  { value: "500+", label: "500+ employees" },
] as const;

const COUNTRIES = [
  "India",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Singapore",
  "UAE",
  "Other",
] as const;

const setupSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  industry: z.string().min(1, "Industry is required"),
  companySize: z.string().min(1, "Company size is required"),
  country: z.string().min(1, "Country is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  phone: z.string().optional(),
});

type SetupValues = z.infer<typeof setupSchema>;

type Step = 1 | 2;

const STEPS = [
  { id: 1 as const, label: "Company Profile", icon: Building2 },
  { id: 2 as const, label: "Your Profile", icon: User },
] as const;

export default function OrgSetupPage() {
  const { data: session } = useSession();
  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const form = useForm<SetupValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      companyName: "",
      industry: "",
      companySize: "",
      country: "",
      firstName: "",
      lastName: "",
      jobTitle: "",
      phone: "",
    },
  });

  function handleGoBack() {
    if (step === 2) setStep(1);
  }

  async function handleStep1Next() {
    const valid = await form.trigger(["companyName", "industry", "companySize", "country"]);
    if (valid) setStep(2);
  }

  async function handleStep2Submit(data: SetupValues) {
    setIsSubmitting(true);
    try {
      await apiClient.patch("/org/setup", data);
      toast.success("Workspace ready — welcome to StreamlineOS!");
      setShowCelebration(true);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  const goToDashboard = () => {
    window.location.href = "/dashboard";
  };

  const currentStepIndex = step - 1;

  return (
    <div className="w-full max-w-md relative">
      {showCelebration && (
        <ConfettiOverlay durationMs={2200} onDone={goToDashboard} />
      )}
      <div className="mb-8 text-center">
        <h1 className="font-display text-2xl sm:text-[1.7rem] font-extrabold tracking-[-0.02em] text-slate-900 leading-tight">
          Welcome aboard
          {session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}!
        </h1>
        <p className="text-[13px] text-slate-500 mt-1">
          Let&apos;s set up your workspace in a minute.
        </p>
      </div>

      <nav aria-label="Setup steps" className="mb-8">
        <ol className="flex items-center gap-0">
          {STEPS.map((s, index) => {
            const StepIcon = s.icon;
            const isCompleted = s.id < step;
            const isCurrent = s.id === step;

            return (
              <li key={s.id} className="flex items-center flex-1 last:flex-initial min-w-0">
                <div className="flex flex-col items-center gap-1 min-w-0">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all shrink-0",
                      isCompleted
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : isCurrent
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-muted border-border text-muted-foreground",
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <StepIcon className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium text-center leading-tight hidden sm:block",
                      isCurrent ? "text-primary" : isCompleted ? "text-emerald-600" : "text-muted-foreground",
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mx-1 mt-[-0.75rem] hidden sm:block transition-colors",
                      s.id < step ? "bg-emerald-500" : "bg-border",
                    )}
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
        <div className="sr-only" aria-live="polite">
          {`Step ${currentStepIndex + 1} of ${STEPS.length}: ${STEPS[currentStepIndex]?.label}`}
        </div>
      </nav>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">Company Profile</h2>
              <p className="text-[13px] text-slate-500 mt-0.5">Tell us about your organization.</p>
            </div>

            <div className="space-y-1">
              <Label className="text-[12px] font-medium text-slate-700">Company name</Label>
              <Input
                {...form.register("companyName")}
                placeholder="Acme Inc."
                className="h-10"
              />
              {form.formState.errors.companyName && (
                <p className="text-[11px] text-red-600">{form.formState.errors.companyName.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-[12px] font-medium text-slate-700">Industry</Label>
              <Select
                onValueChange={(val) => form.setValue("industry", val, { shouldValidate: true })}
                value={form.watch("industry")}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.industry && (
                <p className="text-[11px] text-red-600">{form.formState.errors.industry.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[12px] font-medium text-slate-700">Company size</Label>
                <Select
                  onValueChange={(val) => form.setValue("companySize", val, { shouldValidate: true })}
                  value={form.watch("companySize")}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Size" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_SIZES.map((size) => (
                      <SelectItem key={size.value} value={size.value}>
                        {size.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.companySize && (
                  <p className="text-[11px] text-red-600">{form.formState.errors.companySize.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-[12px] font-medium text-slate-700">Country</Label>
                <Select
                  onValueChange={(val) => form.setValue("country", val, { shouldValidate: true })}
                  value={form.watch("country")}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.country && (
                  <p className="text-[11px] text-red-600">{form.formState.errors.country.message}</p>
                )}
              </div>
            </div>

            <Button onClick={handleStep1Next} className="w-full h-11 mt-2">
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={form.handleSubmit(handleStep2Submit)} className="space-y-4">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">Your Profile</h2>
              <p className="text-[13px] text-slate-500 mt-0.5">A few details about you.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[12px] font-medium text-slate-700">First name</Label>
                <Input
                  {...form.register("firstName")}
                  placeholder="First"
                  className="h-10"
                />
                {form.formState.errors.firstName && (
                  <p className="text-[11px] text-red-600">{form.formState.errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-[12px] font-medium text-slate-700">Last name</Label>
                <Input
                  {...form.register("lastName")}
                  placeholder="Last"
                  className="h-10"
                />
                {form.formState.errors.lastName && (
                  <p className="text-[11px] text-red-600">{form.formState.errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[12px] font-medium text-slate-700">Job title</Label>
              <Input
                {...form.register("jobTitle")}
                placeholder="CEO, Founder, Director…"
                className="h-10"
              />
              {form.formState.errors.jobTitle && (
                <p className="text-[11px] text-red-600">{form.formState.errors.jobTitle.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-[12px] font-medium text-slate-700">
                Phone <span className="text-slate-400 font-normal">(optional)</span>
              </Label>
              <Input
                {...form.register("phone")}
                type="tel"
                placeholder="+91 98765 43210"
                className="h-10"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleGoBack}
                className="flex-1 h-11 border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 h-11">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {isSubmitting ? "Saving…" : "Finish setup"}
              </Button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
