"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { getErrorMessage } from "@/lib/get-error-message";
import { useForm, type FieldPath, type DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { onboardEmployeeInputSchema } from "@/lib/validation/hr";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Form } from "@/components/ui/form";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { STICKY_FOOTER_ABOVE_MOBILE_NAV } from "@/components/ui/content-fill-panel";
import { Check, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { useOnboardEmployee } from "@/hooks/api/hr";
import { useOnboardingTemplateDepartments } from "@/hooks/api/hr/onboarding";
import { DEFAULT_INVITE_ROLE } from "@/lib/constants/user-invite-roles";
import { useRouter } from "next/navigation";
import {
  employeeAdmissionGuidance,
  fetchEmployeeAdmissionCheck,
} from "@/components/hr/check-employee-email";
import { describeUnsentInvite } from "@/components/hr/invite-delivery";
import { buildOnboardEmployeePayload } from "@/components/hr/onboarding-payload";
import { describeOnboardingSuccess } from "@/components/hr/onboarding-result";
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
  2: ["designation", "departmentId", "reportingManagerUserId", "secondaryManagers", "topLevelRole", "topLevelRoleReason", "role", "joiningDate"],
  3: ["taxId"],
  4: [],
};

const COMMON_DEPARTMENTS = ["HR", "Sales", "Customer Support", "Engineering", "Design", "Video Editing"];

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const checkedEmail = useRef<string>("");
  const submittingRef = useRef(false);
  const router = useRouter();
  const { data: departments } = useOnboardingTemplateDepartments();
  const onboardEmployee = useOnboardEmployee();

  const allDepartmentOptions = useMemo(() => {
    const dbNames = new Set(departments?.map((d) => d.name.toLowerCase()) ?? []);
    const real = (departments ?? []).map((d) => ({ ...d, isCommon: false }));
    const extras = COMMON_DEPARTMENTS
      .filter((name) => !dbNames.has(name.toLowerCase()))
      .map((name, i) => ({ id: `common-${i + 1}`, name, isCommon: true }));
    return [...real, ...extras];
  }, [departments]);

  const form = useForm<FormValues>({
    resolver: zodResolver(onboardEmployeeInputSchema),
    defaultValues: {
      firstName: "", lastName: "", email: "", phone: "",
      whatsappSameAsPhone: true, whatsappNumber: "", gender: "MALE",
      designation: "", departmentId: undefined,
      reportingManagerUserId: undefined, reportingManagerRef: null, secondaryManagers: [],
      topLevelRole: false, topLevelRoleReason: undefined,
      role: DEFAULT_INVITE_ROLE, employeeId: "", attachToExistingMember: false, joiningDate: new Date(),
      dateOfBirth: undefined,
      taxId: "", monthlySalary: undefined,
      bankDetails: {
        accountNumber: "",
        bankName: "",
        branch: "",
        ifsc: "",
        accountHolder: "",
        pfUanNumber: "",
        esiIpNumber: "",
      },
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
          const res = await fetchEmployeeAdmissionCheck(email);
          checkedEmail.current = email;
          const guidance = employeeAdmissionGuidance(res.status);
          form.setValue("attachToExistingMember", guidance.attachToExistingMember);
          if (guidance.blocking && guidance.message) {
            form.setError("email", { message: guidance.message });
            toast.error(guidance.message);
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
      if (currentStep !== STEPS.length || submittingRef.current) return;
      submittingRef.current = true;
      onboardEmployee.mutate(
        buildOnboardEmployeePayload(data),
        {
          onSuccess: (result) => {
            toast.success(describeOnboardingSuccess(result.primaryManager));
            const unsentInvite = describeUnsentInvite(result.invite);
            if (unsentInvite)
              toast.warning(unsentInvite, {
                description: "The employee was created. Use Resend invite from their profile once the cause is fixed.",
                duration: 10_000,
              });
            router.push(result.userId ? `/hr/employees/${result.userId}` : "/hr/employees");
          },
          onError: (err) => toast.error(getErrorMessage(err)),
          onSettled: () => {
            submittingRef.current = false;
          },
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
                  "flex items-center justify-center h-5 w-5 rounded-full text-micro font-bold shrink-0",
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
          <div className="min-h-0 flex-1">
            {currentStep === 1 && <StepPersonalInfo form={form} />}
            {currentStep === 2 && (
              <StepEmployment form={form} departments={departments ?? []} />
            )}
            {currentStep === 3 && <StepSkillsPay form={form} />}
            {currentStep === 4 && <StepBanking form={form} />}
            {currentStep === 5 && <StepReview form={form} allDepartmentOptions={allDepartmentOptions} />}
          </div>

          <div
            className={cn(
              "shrink-0 flex items-center justify-between py-4 mt-4 border-t bg-background z-10",
              STICKY_FOOTER_ABOVE_MOBILE_NAV,
            )}
          >
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
