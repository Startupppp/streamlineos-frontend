"use client";

import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateHrTemplate, useHrTemplate, useUpdateHrTemplate } from "@/hooks/api/hr/hr-templates";
import {
  HR_TEMPLATE_KINDS,
  HR_LETTER_TYPES,
  KIND_LABELS,
  LETTER_TYPE_LABELS,
  type HrTemplateListItem,
} from "@/types/hr/templates";
import { ChecklistEditor } from "./checklist-editor";
import { ReviewEditor } from "./review-editor";
import { SurveyEditor } from "./survey-editor";
import { LetterEmailEditor } from "./letter-email-editor";

const CHECKLIST_KINDS = ["onboarding_checklist", "offboarding_checklist", "asset_assignment"] as const;
const REVIEW_KINDS = ["probation_review", "performance_review", "exit_interview"] as const;
const LETTER_KINDS = ["letter", "document_request", "email", "notification", "training"] as const;

const LETTER_EMAIL_KINDS = ["letter", "document_request", "email", "notification", "training"] as const;
const SUBJECT_REQUIRED_KINDS: string[] = ["letter", "document_request", "email", "training"];

const schema = z
  .object({
    kind: z.enum(HR_TEMPLATE_KINDS),
    name: z
      .string()
      .min(1, "Name is required")
      .max(100, "Name must be at most 100 characters")
      .transform((v) => v.trim())
      .refine((v) => v.length >= 3, "Name must be at least 3 characters")
      .refine((v) => /[a-zA-Z]/.test(v), "Name must contain at least one letter"),
    description: z
      .string()
      .max(500, "Description must be at most 500 characters")
      .transform((v) => v.trim())
      .optional(),
    letterType: z.string().optional(),
    contentSubject: z.string().optional(),
    contentBodyHtml: z.string().optional(),
    contentItems: z.unknown().optional(),
    contentSections: z.unknown().optional(),
    contentQuestions: z.unknown().optional(),
  })
  .superRefine((val, ctx) => {
    const isLetterEmail = LETTER_EMAIL_KINDS.some((candidate) => candidate === val.kind);
    if (!isLetterEmail) return;

    if (SUBJECT_REQUIRED_KINDS.includes(val.kind)) {
      if (!val.contentSubject?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Subject is required for this template type",
          path: ["contentSubject"],
        });
      }
    }

    if (!val.contentBodyHtml?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Content body is required",
        path: ["contentBodyHtml"],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

interface TemplateUpsertSheetProps {
  open: boolean;
  onClose: () => void;
  template?: HrTemplateListItem;
}

export function TemplateUpsertSheet({ open, onClose, template }: TemplateUpsertSheetProps) {
  const isEdit = !!template;
  const create = useCreateHrTemplate();
  const update = useUpdateHrTemplate();
  const { data: templateDetail } = useHrTemplate(template?.id ?? 0);
  const isPending = create.isPending || update.isPending;

  const defaultValues = useCallback((): FormValues => {
    const c = templateDetail?.content ?? {};
    return {
      kind: template?.kind ?? "email",
      name: template?.name ?? "",
      description: template?.description ?? "",
      letterType: template?.letterType ?? undefined,
      contentSubject: typeof c.subject === "string" ? c.subject : "",
      contentBodyHtml: typeof c.bodyHtml === "string" ? c.bodyHtml : "",
      contentItems: c.items ?? [],
      contentSections: c.sections ?? [],
      contentQuestions: c.questions ?? [],
    };
  }, [template, templateDetail]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(),
  });

  useEffect(() => {
    if (!open) return;
    if (isEdit && !templateDetail) return;
    form.reset(defaultValues());
  }, [open, isEdit, templateDetail, form, defaultValues]);

  const kind = form.watch("kind");
  const isChecklist = CHECKLIST_KINDS.some((candidate) => candidate === kind);
  const isReview = REVIEW_KINDS.some((candidate) => candidate === kind);
  const isSurvey = kind === "survey";
  const isLetterEmail = LETTER_KINDS.some((candidate) => candidate === kind);
  const isLetter = kind === "letter";

  const handleSubmit = useCallback(
    (values: FormValues) => {
      const kindVal = values.kind;
      const checklistKinds: string[] = ["onboarding_checklist", "offboarding_checklist", "asset_assignment"];
      const reviewKinds: string[] = ["probation_review", "performance_review", "exit_interview"];

      let content: Record<string, unknown>;
      if (checklistKinds.includes(kindVal)) {
        content = { items: values.contentItems ?? [] };
      } else if (reviewKinds.includes(kindVal)) {
        content = { sections: values.contentSections ?? [] };
      } else if (kindVal === "survey") {
        content = { questions: values.contentQuestions ?? [] };
      } else if (kindVal === "goal") {
        content = { goals: values.contentItems ?? [] };
      } else {
        content = { subject: values.contentSubject, bodyHtml: values.contentBodyHtml ?? "" };
      }
      const payload = {
        kind: values.kind,
        name: values.name.trim(),
        description: values.description ?? undefined,
        content,
        letterType: values.letterType ?? undefined,
      };

      if (isEdit && template) {
        update.mutate(
          { templateId: template.id, ...payload },
          {
            onSuccess: () => { toast.success("Template updated"); onClose(); },
            onError: (e) => toast.error(getErrorMessage(e)),
          },
        );
      } else {
        create.mutate(payload, {
          onSuccess: () => { toast.success("Template created"); onClose(); },
          onError: (e) => toast.error(getErrorMessage(e)),
        });
      }
    },
    [isEdit, template, update, create, onClose],
  );

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4">
          <SheetTitle className="text-sm">{isEdit ? "Edit Template" : "New Template"}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <SheetBody className="space-y-4 px-6 py-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="kind"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider">Kind</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={isEdit}>
                      <FormControl>
                        <SelectTrigger className="">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {HR_TEMPLATE_KINDS.map((k) => (
                          <SelectItem key={k} value={k}>{KIND_LABELS[k]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isLetter && (
                <FormField
                  control={form.control}
                  name="letterType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider">Letter Type</FormLabel>
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {HR_LETTER_TYPES.map((lt) => (
                            <SelectItem key={lt} value={lt}>{LETTER_TYPE_LABELS[lt]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wider">Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Template name" className="" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wider">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional description"
                      className="h-16 resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground/70 mb-2">Content</p>

              {isChecklist && (
                <FormField
                  control={form.control}
                  name="contentItems"
                  render={({ field }) => (
                    <ChecklistEditor
                      items={(field.value as Parameters<typeof ChecklistEditor>[0]["items"]) ?? []}
                      onChange={field.onChange}
                    />
                  )}
                />
              )}

              {isReview && (
                <FormField
                  control={form.control}
                  name="contentSections"
                  render={({ field }) => (
                    <ReviewEditor
                      sections={(field.value as Parameters<typeof ReviewEditor>[0]["sections"]) ?? []}
                      onChange={field.onChange}
                    />
                  )}
                />
              )}

              {isSurvey && (
                <FormField
                  control={form.control}
                  name="contentQuestions"
                  render={({ field }) => (
                    <SurveyEditor
                      questions={(field.value as Parameters<typeof SurveyEditor>[0]["questions"]) ?? []}
                      onChange={field.onChange}
                    />
                  )}
                />
              )}

              {isLetterEmail && (
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="contentSubject"
                    render={({ field }) => (
                      <FormItem>
                        <FormMessage className="text-xs" />
                        <input type="hidden" {...field} />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contentBodyHtml"
                    render={({ field }) => (
                      <FormItem>
                        <FormMessage className="text-xs" />
                        <input type="hidden" {...field} />
                      </FormItem>
                    )}
                  />
                  <LetterEmailEditor
                    subject={form.watch("contentSubject")}
                    bodyHtml={form.watch("contentBodyHtml") ?? ""}
                    showSubject={kind !== "notification"}
                    onSubjectChange={(v) => {
                      form.setValue("contentSubject", v, { shouldValidate: form.formState.isSubmitted });
                    }}
                    onBodyChange={(v) => {
                      form.setValue("contentBodyHtml", v, { shouldValidate: form.formState.isSubmitted });
                    }}
                  />
                </div>
              )}
            </div>
            </SheetBody>

            <SheetFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
              <LoadingButton type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Cancel
              </LoadingButton>
              <LoadingButton type="submit" isPending={isPending} loadingText="Saving...">
                {isEdit ? "Save Changes" : "Create Template"}
              </LoadingButton>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
