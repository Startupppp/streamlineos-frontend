"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { getErrorMessage } from "@/lib/get-error-message";
import { useForm, type FieldPath, type DefaultValues, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { onboardEmployeeInputSchema } from "@/lib/validation/hr";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Form } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { useHrDepartments, useOnboardEmployee } from "@/hooks/api/hr";
import { useRoles } from "@/hooks/api/roles";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { StepPersonalInfo } from "./_onboarding/step-personal-info";
import { StepEmployment } from "./_onboarding/step-employment";
import { StepSkillsPay } from "./_onboarding/step-skills-pay";
import { StepBanking } from "./_onboarding/step-banking";
import { StepReview } from "./_onboarding/step-review";

type FormValues = z.infer<typeof onboardEmployeeInputSchema>;

const STEPS = [
  { id: 1, label: "Personal" },
  { id: 2, label: "Job Details" },
  { id: 3, label: "Skills & Pay" },
  { id: 4, label: "Banking" },
  { id: 5, label: "Review" },
];

const STEP_FIELDS: Record<number, FieldPath<FormValues>[]> = {
  1: ["firstName", "lastName", "email", "phone", "gender", "dateOfBirth"],
  2: ["designation", "departmentId", "role", "joiningDate"],
  3: ["taxId"],
  4: [],
};

const COMMON_DEPARTMENTS = ["HR", "Sales", "Customer Support", "Engineering", "Design", "Video Editing"];

const KNOWN_ACRONYMS = new Set(["CEO", "CTO", "CFO", "COO", "CMO", "CIO", "CHRO", "VP", "SVP", "EVP", "AVP", "HR", "IT", "QA", "UI", "UX"]);

function toTitleCase(str: string) {
  return str.trim().replace(/\s+/g, " ").split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

function formatDesignation(str: string) {
  return str.trim().replace(/\s+/g, " ").split(" ").map((word) => {
    const upper = word.toUpperCase();
    return KNOWN_ACRONYMS.has(upper) ? upper : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(" ");
}

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const checkedEmail = useRef<string>("");
  const router = useRouter();
  const { data: departments } = useHrDepartments();
  const { data: orgRoles } = useRoles();
  const onboardEmployee = useOnboardEmployee();

  const assignableRoles = useMemo(
    () => (orgRoles ?? []).filter((r) => r.slug !== "CEO"),
    [orgRoles]
  );

  const allDepartmentOptions = useMemo(() => {
    const dbNames = new Set(departments?.map((d) => d.name.toLowerCase()) ?? []);
    const extras = COMMON_DEPARTMENTS
      .filter((name) => !dbNames.has(name.toLowerCase()))
      .map((name, i) => ({ id: -(i + 1), name, isCommon: true }));
    return [...(departments ?? []), ...extras];
  }, [departments]);

  const form = useForm<FormValues>({
    resolver: zodResolver(onboardEmployeeInputSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      firstName: "", lastName: "", email: "", phone: "",
      whatsappSameAsPhone: true, whatsappNumber: "", gender: "MALE",
      password: "", designation: "", departmentId: undefined,
      role: "ENGINEERING", employeeId: "", joiningDate: new Date(),
      dateOfBirth: undefined,
      taxId: "", monthlySalary: undefined,
      bankDetails: { accountNumber: "", bankName: "", branch: "", ifsc: "", accountHolder: "", pfUanNumber: "" },
    } as DefaultValues<FormValues>,
    mode: "onChange",
  });

  const handleNext = useCallback(async () => {
    const fields = STEP_FIELDS[currentStep];
    if (fields) {
      const valid = await form.trigger(fields);
      if (!valid) return;
    }
    if (currentStep === 1) {
      const email = form.getValues("email")?.toLowerCase().trim();
      if (email && email !== checkedEmail.current) {
        setIsCheckingEmail(true);
        let emailCheckPassed = false;
        try {
          const res = await apiClient.get<{ exists: boolean }>(`/hr/employees/check-email?email=${encodeURIComponent(email)}`);
          checkedEmail.current = email;
          if (res.exists) {
            form.setError("email", { message: "This email already belongs to an employee in your organization" });
            toast.error("This email already belongs to an employee in your organization");
          } else {
            emailCheckPassed = true;
          }
        } catch {
          toast.error("Could not verify email. Please try again.");
        } finally {
          setIsCheckingEmail(false);
        }
        if (!emailCheckPassed) return;
      }
    }
    setCurrentStep((prev) => Math.min(STEPS.length, prev + 1));
  }, [currentStep, form]);

  const handlePrev = useCallback(() => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  }, []);

  const handleSubmit = useCallback(
    (data: FormValues) => {
      if (currentStep !== STEPS.length) return;
      onboardEmployee.mutate(
        {
          ...data,
          firstName: toTitleCase(data.firstName),
          lastName: toTitleCase(data.lastName),
          designation: formatDesignation(data.designation),
          password: data.password ?? "",
        },
        {
          onSuccess: (result) => {
            toast.success("Employee created successfully");
            router.push(result.userId ? `/hr/employees/${result.userId}` : "/hr/employees");
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        }
      );
    },
    [onboardEmployee, router, currentStep]
  );

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-full">
      <div className="flex items-center gap-1 mb-6 shrink-0">
        {STEPS.map((step, i) => {
          const isCompleted = step.id < currentStep;
          const isActive = step.id === currentStep;
          return (
            <div key={step.id} className="flex items-center gap-1 flex-1">
              <button
                type="button"
                onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                disabled={step.id > currentStep}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors w-full",
                  isCompleted && "bg-primary/10 text-primary cursor-pointer hover:bg-primary/15",
                  isActive && "bg-primary text-primary-foreground",
                  !isCompleted && !isActive && "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                <span className={cn(
                  "flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold shrink-0",
                  isCompleted && "bg-primary text-primary-foreground",
                  isActive && "bg-primary-foreground text-primary",
                  !isCompleted && !isActive && "bg-muted-foreground/20 text-muted-foreground"
                )}>
                  {isCompleted ? <Check className="h-3 w-3" /> : step.id}
                </span>
                <span className="hidden sm:inline truncate">{step.label}</span>
              </button>
              {i < STEPS.length - 1 && <div className="h-px w-2 bg-border shrink-0" />}
            </div>
          );
        })}
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && currentStep < STEPS.length) {
              e.preventDefault();
            }
          }}
          className="flex flex-col flex-1 min-h-0"
        >
          <ScrollArea hideScrollbar className="min-h-0 flex-1">
            <div className="overscroll-contain">
            {currentStep === 1 && <StepPersonalInfo form={form} />}
            {currentStep === 2 && (
              <StepEmployment
                form={form}
                assignableRoles={assignableRoles}
              />
            )}
            {currentStep === 3 && <StepSkillsPay form={form} />}
            {currentStep === 4 && <StepBanking form={form} />}
            {currentStep === 5 && <StepReview form={form} allDepartmentOptions={allDepartmentOptions} />}
            </div>
          </ScrollArea>

          <div className="shrink-0 flex items-center justify-between pt-4 mt-4 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={currentStep === 1 || onboardEmployee.isPending}
              className="gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back
            </Button>

            {currentStep < STEPS.length ? (
              <Button type="button" size="sm" onClick={handleNext} className="gap-1" disabled={isCheckingEmail}>
                {isCheckingEmail ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Checking...</> : <>Next<ChevronRight className="h-3.5 w-3.5" /></>}
              </Button>
            ) : (
              <LoadingButton type="submit" size="sm" isPending={onboardEmployee.isPending} loadingText="Saving..." className="gap-1 min-w-[100px]">
                <Check className="h-3.5 w-3.5" />Submit
              </LoadingButton>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
