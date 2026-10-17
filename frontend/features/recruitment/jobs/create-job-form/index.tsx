"use client";

import { useState } from "react";
import { flushSync } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useCreateJobPosting, useUpdateJobPosting } from "@/hooks/api/hr/recruitment";
import { useHrDepartments } from "@/hooks/api/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import { Section1, Section2 } from "./job-basics-sections";
import { Section3, Section4, Section5 } from "./compensation-qualifications-sections";
import { Section6 } from "./job-description-sections";
import { Section7, Section8 } from "./hiring-pipeline-sections";
import { Section9, Section10 } from "./publishing-settings-sections";
import {
  createJobFormSchema,
  missingForPublish,
  blockOf,
  NO_HIRING_FLOW,
  NO_JOB_TEMPLATE,
  type CreateJobFormValues,
  type PublishRequirement,
} from "./schema";
import { parseJobToFormValues } from "./parse-job";
import { JobPostingPreview } from "./job-posting-preview";
import type { JobPosting } from "@/types/hr/recruitment";
import { Save } from "lucide-react";
import { SendIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";

function buildDescription(data: CreateJobFormValues): string | undefined {
  const lines: string[] = [];
  if (data.overview) lines.push(`=== OVERVIEW ===\n${data.overview}`);
  if (data.responsibilities) lines.push(`=== RESPONSIBILITIES ===\n${data.responsibilities}`);
  if (data.workMode) lines.push(`=== WORK MODE ===\n${data.workMode}`);
  if ((data.requiredSkills ?? []).length > 0) {
    lines.push(`=== REQUIRED SKILLS ===\n${(data.requiredSkills ?? []).join(", ")}`);
  }
  if ((data.preferredSkills ?? []).length > 0) {
    lines.push(`=== PREFERRED SKILLS ===\n${(data.preferredSkills ?? []).join(", ")}`);
  }
  if (data.hiringManager) lines.push(`=== HIRING MANAGER ===\n${data.hiringManager}`);
  if ((data.interviewRounds ?? []).length > 0) {
    lines.push(`=== INTERVIEW ROUNDS ===\n${(data.interviewRounds ?? []).join(", ")}`);
  }
  if (data.visibility) lines.push(`=== VISIBILITY ===\n${data.visibility}`);
  if (data.priority) lines.push(`=== PRIORITY ===\n${data.priority}`);
  return lines.length > 0 ? lines.join("\n\n") : undefined;
}

function buildRequirements(data: CreateJobFormValues): string | undefined {
  const parts: string[] = [];
  if (data.jobRequirements) parts.push(data.jobRequirements);
  if (data.educationLevel) parts.push(`Education: ${data.educationLevel}`);
  if ((data.tags ?? []).length > 0) parts.push(`Tags: ${(data.tags ?? []).join(", ")}`);
  return parts.length > 0 ? parts.join("\n\n") : undefined;
}

function buildExperience(data: CreateJobFormValues): string | undefined {
  const min = data.minExperience ?? 0;
  if (!data.educationLevel && data.maxExperience == null && min === 0) return undefined;
  const range = `${min}${data.maxExperience != null ? `–${data.maxExperience}` : "+"} years`;
  return data.educationLevel ? `${range} | ${data.educationLevel}` : range;
}

interface MissingFieldButtonProps {
  item: PublishRequirement;
  onSelect: (key: string) => void;
}

function MissingFieldButton({ item, onSelect }: MissingFieldButtonProps) {
  function handleClick() { onSelect(item.key); }
  return (
    <button type="button" onClick={handleClick} className="text-xs font-medium text-status-danger-ink underline underline-offset-2 hover:no-underline">
      {item.label}
    </button>
  );
}

interface CreateJobFormProps {
  job?: JobPosting;
}

export function CreateJobForm({ job }: CreateJobFormProps) {
  const router = useRouter();
  const createJob = useCreateJobPosting();
  const updateJob = useUpdateJobPosting();
  const { data: departments } = useHrDepartments();
  const isEdit = !!job;
  const [openBlocks, setOpenBlocks] = useState<string[]>([]);
  const [missing, setMissing] = useState<PublishRequirement[]>([]);

  const form = useForm<CreateJobFormValues>({
    resolver: zodResolver(createJobFormSchema),
    mode: "onBlur",
    defaultValues: {
      openings: 1,
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
      jobTemplateId: NO_JOB_TEMPLATE,
      ...(job ? parseJobToFormValues(job) : {}),
    },
  });

  const requireDepartment = (departments?.length ?? 0) > 0;

  function revealField(key: string) {
    const block = blockOf(key);
    if (block !== "essentials") {
      flushSync(() => setOpenBlocks((prev) => (prev.includes(block) ? prev : [...prev, block])));
    }
    const el = document.querySelector<HTMLElement>(`[data-field="${key}"]`);
    el?.scrollIntoView({ block: "center" });
    el?.querySelector<HTMLElement>("input, textarea, button")?.focus();
  }

  async function submit(intent: "DRAFT" | "OPEN" | "SAVE") {
    setMissing([]);
    const valid = await form.trigger();
    const values = form.getValues();
    const gaps = intent === "OPEN" || (intent === "SAVE" && job?.status === "OPEN")
      ? missingForPublish(values, { requireDepartment })
      : [];
    for (const gap of gaps) {
      form.setError(gap.key, { type: "required", message: `${gap.label} is required to publish` });
    }
    if (gaps.length > 0) {
      setMissing(gaps);
      return;
    }
    if (!valid) {
      const firstError = Object.keys(form.formState.errors)[0];
      if (firstError) revealField(firstError);
      toast.error("Fix the highlighted fields first");
      return;
    }

    const data = createJobFormSchema.parse(values);
    const flowId = Number(data.hiringFlowId);
    const knownDepartment = departments?.some((d) => String(d.id) === data.departmentId);
    const payload = {
      title: data.title.trim(),
      departmentId: knownDepartment ? data.departmentId : undefined,
      hiringFlowId: !isNaN(flowId) && flowId > 0 ? flowId : undefined,
      location: [data.stateCity, data.country].filter(Boolean).join(", ") || undefined,
      type: data.jobType,
      experience: buildExperience(data),
      salaryMin: data.salaryMin,
      salaryMax: data.salaryMax,
      description: buildDescription(data),
      requirements: buildRequirements(data),
      benefits: data.benefits || undefined,
      openings: data.openings,
      applicationDeadline: data.applicationDeadline || undefined,
      screeningQuestions: data.screeningQuestions,
    };

    if (isEdit && job) {
      updateJob.mutate({ jobId: job.id, ...payload }, {
        onSuccess: () => {
          toast.success("Job posting updated");
          router.push("/recruitment/jobs");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
      return;
    }
    const status = intent === "OPEN" ? "OPEN" : "DRAFT";
    createJob.mutate({ ...payload, status }, {
      onSuccess: () => {
        toast.success(status === "DRAFT" ? "Job saved as draft" : "Job published");
        router.push("/recruitment/jobs");
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleSaveDraft() { void submit("DRAFT"); }
  function handlePublish() { void submit("OPEN"); }
  function handleSaveChanges() { void submit("SAVE"); }

  const isPending = createJob.isPending || updateJob.isPending;

  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 flex flex-col min-w-0">
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4 sm:px-6 py-6 space-y-6 max-w-3xl">
            <section aria-labelledby="job-essentials-heading" className="space-y-4">
              <h2 id="job-essentials-heading" className="text-sm font-semibold text-foreground">Essentials</h2>
              <Section1 form={form} departments={departments} />
            </section>

            <Accordion type="multiple" value={openBlocks} onValueChange={setOpenBlocks} className="rounded-xl border border-border px-4">
              <AccordionItem value="details">
                <AccordionTrigger>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">Details</span>
                    <span className="block text-xs font-normal text-muted-foreground">Location, compensation, experience, skills, description</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-8">
                  <Section2 form={form} />
                  <Section3 form={form} />
                  <Section4 form={form} />
                  <Section5 form={form} />
                  <Section6 form={form} />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="hiring">
                <AccordionTrigger>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">Hiring &amp; visibility</span>
                    <span className="block text-xs font-normal text-muted-foreground">Workflow, application settings, visibility, priority</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-8">
                  <Section7 form={form} />
                  <Section8 form={form} />
                  <Section9 form={form} />
                  <Section10 form={form} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </ScrollArea>

        <div className="shrink-0 border-t bg-card px-4 sm:px-6 py-3 space-y-3">
          {missing.length > 0 && (
            <div role="alert" className="rounded-lg border border-status-danger-rule bg-status-danger-surface px-3 py-2">
              <p className="text-xs font-semibold text-status-danger-ink">To publish, fill in:</p>
              <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {missing.map((item) => (
                  <li key={item.key}>
                    <MissingFieldButton item={item} onSelect={revealField} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            {isEdit ? (
              <LoadingButton size="sm" onClick={handleSaveChanges} isPending={isPending} loadingText="Saving…" className="gap-1.5">
                <Save className="h-3.5 w-3.5" />
                Save changes
              </LoadingButton>
            ) : (
              <>
                <LoadingButton variant="outline" size="sm" onClick={handleSaveDraft} isPending={isPending} loadingText="Saving…" className="gap-1.5">
                  <Save className="h-3.5 w-3.5" />
                  Save draft
                </LoadingButton>
                <AnimatedIconButton icon={SendIcon} size="sm" onClick={handlePublish} disabled={isPending} className="gap-1.5">
                  Publish
                </AnimatedIconButton>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="hidden xl:block w-[380px] shrink-0 border-l bg-muted/20">
        <ScrollArea className="h-full">
          <div className="p-4">
            <JobPostingPreview control={form.control} departments={departments} />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
