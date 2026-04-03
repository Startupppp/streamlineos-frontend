"use client";

import { useState, useMemo } from "react";
import { useForm, FieldPath, DefaultValues, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { onboardEmployeeInputSchema } from "../../lib/validations/hr";

import { Button } from "../ui/button";
import { Form } from "../ui/form";
import { Card, CardContent } from "../ui/card";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Lightbulb,
} from "lucide-react";
import { useHrDepartments, useOnboardEmployee } from "@/lib/api/hooks/hr";
import { useRolesList } from "@/lib/api/hooks/roles";
import { useRouter } from "next/navigation";

import { StepPersonalInfo } from "./_onboarding/step-personal-info";
import { StepEmployment } from "./_onboarding/step-employment";
import { StepSkillsPay } from "./_onboarding/step-skills-pay";
import { StepBanking } from "./_onboarding/step-banking";
import { StepReview } from "./_onboarding/step-review";

const STEPS = [
  { id: 1, label: "PERSONAL INFO" },
  { id: 2, label: "JOB DETAILS" },
  { id: 3, label: "SKILLS & PAY" },
  { id: 4, label: "BANKING" },
  { id: 5, label: "REVIEW" },
];

const STEP_DETAILS: Record<number, { title: string; description: string }> = {
  1: { title: "Personal Information", description: "Enter the employee's basic personal details to get started with onboarding." },
  2: { title: "Role & Department", description: "Define their position, department, and system access level within the organization." },
  3: { title: "Skills, Experience & Salary", description: "Professional background, qualifications, and monthly compensation details." },
  4: { title: "Banking Details", description: "Bank account information required for payroll processing." },
  5: { title: "Review & Submit", description: "Review all the information entered before finalizing the onboarding." },
};

const COMMON_ROLE_DEPARTMENTS = [
  "HR",
  "Sales",
  "Customer Support",
  "Engineering",
  "Design",
  "Video Editing",
];


export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const router = useRouter();
  const { data: departments } = useHrDepartments();
  const { data: orgRoles } = useRolesList();
  const onboardEmployee = useOnboardEmployee();

  const assignableRoles = useMemo(
    () => (orgRoles || []).filter((r) => r.slug !== "CEO"),
    [orgRoles]
  );
  const allDepartmentOptions = useMemo(() => {
    const dbDeptNames = new Set(departments?.map(d => d.name.toLowerCase()) || []);
    const commonRoles = COMMON_ROLE_DEPARTMENTS
      .filter(role => !dbDeptNames.has(role.toLowerCase()))
      .map((role, idx) => ({ id: -(idx + 1), name: role, isCommon: true }));
    return [
      ...(departments || []),
      ...commonRoles
    ];
  }, [departments]);

  type FormValues = z.infer<typeof onboardEmployeeInputSchema>;

  const defaultFormValues = useMemo(() => {
    const base = {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      whatsappSameAsPhone: true,
      whatsappNumber: "",
      gender: "MALE",
      password: "",
      designation: "",
      departmentId: undefined,
      role: "ENGINEERING",
      employeeId: "",
      joiningDate: new Date(),
      dateOfBirth: undefined,
      skills: "",
      experienceYears: undefined,
      taxId: "",
      monthlySalary: undefined,
      bankDetails: {
        accountNumber: "",
        bankName: "",
        branch: "",
        ifsc: "",
        accountHolder: "",
        pfUanNumber: "",
      }
    };
    return base;
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(onboardEmployeeInputSchema) as unknown as Resolver<FormValues>,
    defaultValues: defaultFormValues as DefaultValues<FormValues>,
    mode: "onChange",
  });

  const { trigger } = form;

  const nextStep = async () => {
    let fieldsToValidate: FieldPath<FormValues>[] = [];
    switch (currentStep) {
      case 1: fieldsToValidate = ['firstName', 'lastName', 'email', 'phone', 'gender', 'dateOfBirth']; break;
      case 2: fieldsToValidate = ['designation', 'departmentId', 'role', 'joiningDate']; break;
      case 3: fieldsToValidate = ['skills', 'experienceYears', 'taxId']; break;
      case 4: fieldsToValidate = ['bankDetails.accountNumber', 'bankDetails.bankName', 'bankDetails.branch', 'bankDetails.ifsc', 'bankDetails.accountHolder']; break;
    }
    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      const nextStepNum = Math.min(STEPS.length, currentStep + 1);
      setCurrentStep(nextStepNum);
    }
  };

  const prevStep = () => {
    const prevStepNum = Math.max(1, currentStep - 1);
    setCurrentStep(prevStepNum);
  };

  const toTitleCase = (str: string) =>
    str.trim().replace(/\s+/g, " ").split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");

  const KNOWN_ACRONYMS = ["CEO", "CTO", "CFO", "COO", "CMO", "CIO", "CHRO", "VP", "SVP", "EVP", "AVP", "HR", "IT", "QA", "UI", "UX"];

  const formatDesignation = (str: string) => {
    return str.trim().replace(/\s+/g, " ").split(" ").map(word => {
      const upper = word.toUpperCase();
      if (KNOWN_ACRONYMS.includes(upper)) return upper;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(" ");
  };

  const onSubmit = (data: z.infer<typeof onboardEmployeeInputSchema>) => {
    onboardEmployee.mutate(
      {
        ...data,
        firstName: toTitleCase(data.firstName),
        lastName: toTitleCase(data.lastName),
        designation: formatDesignation(data.designation),
        password: data.password ?? "",
      } as import("@/types/hr").OnboardEmployeeInput,
      {
        onSuccess: () => {
          toast.success("Employee onboarding initiated successfully!");
          router.push("/hr/employees");
        },
        onError: (err) => {
          toast.error(err.message || "Failed to onboard employee");
        },
      }
    );
  };

  const nextStepLabel = currentStep < STEPS.length ? STEPS[currentStep]?.label : "";

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Onboard New Employee</h1>
        <p className="text-sm text-muted-foreground">Complete the steps below to add a new team member to the organization.</p>
      </div>

      {/* Step Circles with Connecting Lines */}
      <div className="mb-10">
        <div className="flex items-center justify-between relative">
          {/* Connecting line behind circles */}
          <div className="absolute top-5 left-0 right-0 h-[2px] bg-border z-0" />
          <div
            className="absolute top-5 left-0 h-[2px] z-0 transition-all duration-500 gradient-wizard"
            style={{
              width: `${((Math.min(currentStep, STEPS.length) - 1) / (STEPS.length - 1)) * 100}%`,
            }}
          />

          {STEPS.map((step) => {
            const isCompleted = step.id < currentStep;
            const isActive = step.id === currentStep;

            return (
              <div key={step.id} className="flex flex-col items-center gap-2 relative z-10">
                <motion.div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300",
                    isCompleted
                      ? "bg-gold border-gold text-white"
                      : isActive
                        ? "bg-blue border-blue text-white shadow-lg shadow-blue/30"
                        : "bg-card border-border text-muted-foreground"
                  )}
                  animate={isActive ? { scale: [1, 1.08, 1] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    step.id
                  )}
                </motion.div>
                <span className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider hidden md:block",
                  isCompleted
                    ? "text-gold"
                    : isActive
                      ? "text-blue dark:text-blue-400"
                      : "text-muted-foreground/60"
                )}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Card */}
      <Card className="border-border shadow-xl overflow-hidden">
        <CardContent className="p-0">
          {/* Card Header with step badge */}
          <div className="px-6 md:px-8 pt-6 md:pt-8 pb-4 border-b border-border bg-muted/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">{STEP_DETAILS[currentStep]?.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{STEP_DETAILS[currentStep]?.description}</p>
              </div>
              <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue/10 text-blue dark:bg-blue/20 dark:text-blue-300 border border-blue/20">
                Step {currentStep} of {STEPS.length}
              </span>
            </div>
          </div>

          {/* Form Content */}
          <div className="px-6 md:px-8 py-6 md:py-8 min-h-[380px]">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    {currentStep === 1 && (
                      <StepPersonalInfo form={form} />
                    )}

                    {currentStep === 2 && (
                      <StepEmployment
                        form={form}
                        departments={departments}
                        allDepartmentOptions={allDepartmentOptions}
                        assignableRoles={assignableRoles}
                      />
                    )}

                    {currentStep === 3 && (
                      <StepSkillsPay form={form} />
                    )}

                    {currentStep === 4 && (
                      <StepBanking form={form} />
                    )}

                    {currentStep === 5 && (
                      <StepReview
                        form={form}
                        allDepartmentOptions={allDepartmentOptions}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Bottom Action Bar */}
                <div className="flex items-center justify-between pt-6 border-t border-border mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 1 || onboardEmployee.isPending}
                    className="gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous Step
                  </Button>

                  <div className="flex items-center gap-3">
                    {currentStep < 5 ? (
                      <Button
                        type="button"
                        onClick={nextStep}
                        className="gap-1.5 text-white gradient-gold"
                      >
                        Continue to {nextStepLabel}
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={onboardEmployee.isPending}
                        className="gap-1.5 text-white min-w-[140px] gradient-green"
                      >
                        {onboardEmployee.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            Submit
                            <Check className="w-4 h-4" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </form>
            </Form>
          </div>
        </CardContent>
      </Card>

      {/* Onboarding Tip */}
      <div className="mt-6 flex items-start gap-3 p-4 rounded-lg bg-muted/40 border border-border text-sm text-muted-foreground">
        <Lightbulb className="w-5 h-5 text-gold shrink-0 mt-0.5" />
        <div>
          <span className="font-medium text-foreground">Onboarding Tip:</span>{" "}
          Your progress is auto-saved. You can close this page and resume later from where you left off.
        </div>
      </div>
    </div>
  );
}
