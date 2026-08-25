"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCreateJobPosting, useUpdateJobPosting } from "@/hooks/api/hr/recruitment";
import { useHrDepartments } from "@/hooks/api/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import { FormSidebar } from "./sidebar";
import { Section1, Section2 } from "./job-basics-sections";
import { Section3, Section4, Section5 } from "./compensation-qualifications-sections";
import { Section6 } from "./job-description-sections";
import { Section7, Section8 } from "./hiring-pipeline-sections";
import { Section9, Section10 } from "./publishing-settings-sections";
import { createJobFormSchema, SECTION_KEYS, NO_HIRING_FLOW, type CreateJobFormValues } from "./schema";
import { parseJobToFormValues } from "./parse-job";
import { JobPostingPreview } from "./job-posting-preview";
import { PublishReadiness } from "./publish-readiness";
import type { JobPosting } from "@/types/hr/recruitment";
import { cn } from "@/lib/utils";
import { Save } from "lucide-react";
import { SendIcon, ChevronLeftIcon, ChevronRightIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";

interface StepIndicatorButtonProps {
  idx: number;
  isActive: boolean;
  isCompleted: boolean;
  hasError: boolean;
  title: string;
  onStepClick: (i: number) => void;
}

function StepIndicatorButton({ idx, isActive, isCompleted, hasError, title, onStepClick }: StepIndicatorButtonProps) {
  function handleClick() { onStepClick(idx); }
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "h-1.5 rounded-full transition-all duration-200 cursor-pointer",
        isActive
          ? "w-6 bg-primary"
          : isCompleted && !hasError
            ? "w-1.5 bg-status-success-fill"
            : hasError
              ? "w-1.5 bg-status-danger-fill"
              : "w-1.5 bg-muted-foreground/20 hover:bg-muted-foreground/40"
      )}
      aria-label={`Go to step ${idx + 1}: ${title}`}
    />
  );
}

const STEPS = [
  { title: "Basic Job Details", subtitle: "Title, dept, type" },
  { title: "Location Details", subtitle: "Country, city, office" },
  { title: "Compensation Details", subtitle: "Salary, currency, type" },
  { title: "Experience & Education", subtitle: "Years, education level" },
  { title: "Skills & Tags", subtitle: "Required & preferred" },
  { title: "Job Description", subtitle: "Overview, responsibilities" },
  { title: "Hiring Workflow", subtitle: "Manager, rounds, Q-bank" },
  { title: "Application Settings", subtitle: "Resume, cover letter" },
  { title: "Job Status & Visibility", subtitle: "Status, deadline" },
  { title: "Additional Settings", subtitle: "Priority, referral" },
] as const;

const SECTIONS = [Section1, Section2, Section3, Section4, Section5, Section6, Section7, Section8, Section9, Section10];

function buildDescription(data: CreateJobFormValues): string {
  const lines: string[] = [];
  lines.push(`=== OVERVIEW ===\n${data.overview}`);
  lines.push(`=== RESPONSIBILITIES ===\n${data.responsibilities}`);
  lines.push(`=== WORK MODE ===\n${data.workMode}`);
  if ((data.requiredSkills ?? []).length > 0) {
    lines.push(`=== REQUIRED SKILLS ===\n${data.requiredSkills.join(", ")}`);
  }
  if ((data.preferredSkills ?? []).length > 0) {
    lines.push(`=== PREFERRED SKILLS ===\n${data.preferredSkills!.join(", ")}`);
  }
  lines.push(`=== HIRING MANAGER ===\n${data.hiringManager}`);
  lines.push(`=== INTERVIEW ROUNDS ===\n${data.interviewRounds.join(", ")}`);
  lines.push(`=== VISIBILITY ===\n${data.visibility}`);
  lines.push(`=== PRIORITY ===\n${data.priority}`);
  return lines.join("\n\n");
}

function buildRequirements(data: CreateJobFormValues): string {
  const parts: string[] = [data.jobRequirements];
  if (data.educationLevel) parts.push(`Education: ${data.educationLevel}`);
  if ((data.tags ?? []).length > 0) parts.push(`Tags: ${data.tags!.join(", ")}`);
  return parts.join("\n\n");
}

interface CreateJobFormProps {
  job?: JobPosting;
}

export function CreateJobForm({ job }: CreateJobFormProps) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const createJob = useCreateJobPosting();
  const updateJob = useUpdateJobPosting();
  const { data: departments } = useHrDepartments();
  const isEdit = !!job;

  const parsed = job ? parseJobToFormValues(job) : {};

  const form = useForm<CreateJobFormValues>({
    resolver: zodResolver(createJobFormSchema),
    mode: "onBlur",
    defaultValues: {
      openings: 1,
      salaryMin: undefined,
      salaryMax: undefined,
      minExperience: 0,
      requiredSkills: [],
      preferredSkills: [],
      tags: [],
      interviewRounds: [],
      resumeRequired: true,
      coverLetterRequired: false,
      referralEnabled: true,
      approvalRequired: false,
      status: "DRAFT",
      hiringFlowId: NO_HIRING_FLOW,
      ...parsed,
    },
  });

  const { formState: { errors } } = form;

  const getStepHasError = useCallback(
    (index: number) => {
      const keys = SECTION_KEYS[index];
      return keys.some((k) => !!errors[k as keyof CreateJobFormValues]);
    },
    [errors]
  );

  const getStepCompleted = useCallback(
    (index: number) => {
      const keys = SECTION_KEYS[index];
      const values = form.getValues();
      return keys.every((k) => {
        const v = values[k as keyof CreateJobFormValues];
        if (Array.isArray(v)) return v.length > 0;
        return v !== undefined && v !== null && v !== "";
      });
    },
    [form]
  );

  const handleSubmit = useCallback(
    async (status: "DRAFT" | "OPEN") => {
      const valid = await form.trigger();
      if (!valid) {
        const firstErrorIdx = SECTION_KEYS.findIndex((keys) =>
          keys.some((k) => !!form.formState.errors[k as keyof CreateJobFormValues])
        );
        if (firstErrorIdx !== -1) setActiveStep(firstErrorIdx);
        toast.error("Please fix validation errors before submitting");
        return;
      }

      const data = form.getValues();
      const flowId = Number(data.hiringFlowId);
      const payload = {
        title: data.title.trim(),
        departmentId: data.departmentId || undefined,
        hiringFlowId: !isNaN(flowId) && flowId > 0 ? flowId : undefined,
        location: `${data.stateCity}, ${data.country}`,
        type: data.jobType,
        experience: `${data.minExperience}${data.maxExperience != null ? `–${data.maxExperience}` : "+"} years | ${data.educationLevel}`,
        salaryMin: data.salaryMin,
        salaryMax: data.salaryMax,
        description: buildDescription(data),
        requirements: buildRequirements(data),
        benefits: data.benefits || undefined,
        openings: data.openings,
        applicationDeadline: data.applicationDeadline || undefined,
        status,
        screeningQuestions: data.screeningQuestions,
      };

      if (isEdit && job) {
        updateJob.mutate({ id: job.id, ...payload }, {
          onSuccess: () => {
            toast.success("Job posting updated");
            router.push("/hr/recruitment/jobs");
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        });
      } else {
        createJob.mutate(payload, {
          onSuccess: () => {
            toast.success(status === "DRAFT" ? "Job saved as draft" : "Job published successfully");
            router.push("/hr/recruitment/jobs");
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        });
      }
    },
    [form, createJob, updateJob, router, isEdit, job]
  );

  const handleSaveDraft = useCallback(() => handleSubmit("DRAFT"), [handleSubmit]);
  const handlePublish = useCallback(() => handleSubmit("OPEN"), [handleSubmit]);
  const handlePrev = useCallback(() => setActiveStep((p) => p - 1), []);
  const handleNext = useCallback(() => setActiveStep((p) => p + 1), []);

  const isPending = createJob.isPending || updateJob.isPending;
  const { iconRef: nextIconRef, hoverHandlers: nextHoverHandlers } = useAnimatedIcon();

  const steps = STEPS.map((s, i) => ({
    ...s,
    number: i + 1,
    active: activeStep === i,
    completed: getStepCompleted(i),
    hasError: getStepHasError(i),
  }));

  const ActiveSection = SECTIONS[activeStep];
  const isLastStep = activeStep === STEPS.length - 1;

  return (
    <div className="flex h-full min-h-0">
      <FormSidebar steps={steps} onStepClick={setActiveStep} />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b bg-card gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-1.5">
              {STEPS.map((s, i) => (
                <StepIndicatorButton
                  key={i}
                  idx={i}
                  isActive={i === activeStep}
                  isCompleted={steps[i]?.completed ?? false}
                  hasError={steps[i]?.hasError ?? false}
                  title={s.title}
                  onStepClick={setActiveStep}
                />
              ))}
            </div>
            <div className="min-w-0">
              <span className="text-dense font-semibold text-muted-foreground uppercase tracking-wider">
                Step {activeStep + 1} of {STEPS.length}
              </span>
              <span className="text-dense text-muted-foreground mx-1.5">—</span>
              <span className="text-dense font-medium text-foreground">{STEPS[activeStep].title}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <PublishReadiness
              steps={steps.map((s) => ({ title: s.title, completed: s.completed, hasError: s.hasError }))}
              onStepClick={setActiveStep}
            />
            <div className="w-px h-5 bg-border/60 shrink-0" />
            {isEdit ? (
              <LoadingButton variant="outline" size="sm" onClick={handleSaveDraft} isPending={isPending} loadingText="Saving…" className="gap-1.5">
                <Save className="h-3.5 w-3.5" />
                Save Changes
              </LoadingButton>
            ) : (
              <>
                <LoadingButton variant="outline" size="sm" onClick={handleSaveDraft} isPending={isPending} loadingText="Saving…" className="gap-1.5">
                  <Save className="h-3.5 w-3.5" />
                  Save Draft
                </LoadingButton>
                <AnimatedIconButton icon={SendIcon} variant="outline" size="sm" onClick={handlePublish} disabled={isPending} className="gap-1.5">
                  Publish Job
                </AnimatedIconButton>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 flex">
          <ScrollArea className="flex-1 min-w-0">
            <div className="px-6 py-6">
              <ActiveSection form={form} departments={departments} />
            </div>
          </ScrollArea>

          <div className="hidden xl:block w-[380px] shrink-0 border-l bg-muted/20">
            <ScrollArea className="h-full">
              <div className="p-4">
                <JobPostingPreview control={form.control} departments={departments} />
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-between px-6 py-3 border-t bg-card gap-3">
          <AnimatedIconButton
            icon={ChevronLeftIcon}
            variant="outline"
            size="sm"
            disabled={activeStep === 0}
            onClick={handlePrev}
            className="gap-1.5"
          >
            Previous
          </AnimatedIconButton>

          <span className="text-dense font-semibold text-muted-foreground uppercase tracking-wider">
            {activeStep + 1} / {STEPS.length}
          </span>

          {isLastStep ? (
            <AnimatedIconButton icon={SendIcon} size="sm" onClick={handlePublish} disabled={isPending} className="gap-1.5">
              {isEdit ? "Save Changes" : "Publish Job"}
            </AnimatedIconButton>
          ) : (
            <Button size="sm" onClick={handleNext} className="gap-1.5" {...nextHoverHandlers}>
              Next
              <ChevronRightIcon ref={nextIconRef} size={14} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
