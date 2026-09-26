"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle2, Send } from "lucide-react";
import {
  intakeFormSchema,
  type IntakeFormValues,
} from "@/features/build/intake/public-intake-schema";
import { useSubmitIntake } from "@/hooks/api/build/public-intake";
import { useProjectIntakeForm, useSubmitPublicForm } from "@/hooks/api/build/public-form";
import { FieldInput } from "@/features/build/forms/field-input";

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const;

const REQUEST_TYPE_OPTIONS = [
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature" },
  { value: "task", label: "Task" },
  { value: "question", label: "Question" },
  { value: "other", label: "Other" },
] as const;

function LegacyIntakeForm({ projectId }: { projectId: string }) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<IntakeFormValues>({
    resolver: zodResolver(intakeFormSchema),
  });

  const mutation = useSubmitIntake(projectId);

  const onSubmit = useCallback(
    (values: IntakeFormValues) => {
      const output = intakeFormSchema.parse(values);
      mutation.mutate(output);
    },
    [mutation],
  );

  if (mutation.isSuccess) {
    return (
      <div className="text-center py-6 space-y-3">
        <div className="w-16 h-16 rounded-full bg-status-success-surface mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-status-success-ink" />
        </div>
        <p className="text-lg font-semibold text-foreground">Request submitted</p>
        <p className="text-sm text-muted-foreground">
          Your request has been received and will be reviewed by the team. Thank you for reaching out.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="intake-title" className="text-xs">
          Request title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="intake-title"
          placeholder="Briefly describe your request"
          {...register("title")}
          aria-invalid={errors.title !== undefined}
        />
        {errors.title && (
          <p className="text-xs text-destructive" role="alert">
            {errors.title.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="intake-type" className="text-xs">Type</Label>
          <Controller
            control={control}
            name="requestType"
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || undefined)}>
                <SelectTrigger id="intake-type" className="text-sm">
                  <SelectValue placeholder="Select type…" />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="intake-priority" className="text-xs">Priority</Label>
          <Controller
            control={control}
            name="priority"
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || undefined)}>
                <SelectTrigger id="intake-priority" className="text-sm">
                  <SelectValue placeholder="Select priority…" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="intake-description" className="text-xs">Details</Label>
        <Textarea
          id="intake-description"
          rows={4}
          placeholder="Provide any additional context or details (optional)"
          {...register("description")}
          aria-invalid={errors.description !== undefined}
        />
        {errors.description && (
          <p className="text-xs text-destructive" role="alert">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="intake-name" className="text-xs">Your name</Label>
        <Input
          id="intake-name"
          placeholder="Jane Smith (optional)"
          {...register("submitterName")}
          aria-invalid={errors.submitterName !== undefined}
        />
        {errors.submitterName && (
          <p className="text-xs text-destructive" role="alert">
            {errors.submitterName.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="intake-email" className="text-xs">Your email</Label>
        <Input
          id="intake-email"
          type="email"
          placeholder="you@example.com (optional)"
          {...register("submitterEmail")}
          aria-invalid={errors.submitterEmail !== undefined}
        />
        {errors.submitterEmail && (
          <p className="text-xs text-destructive" role="alert">
            {errors.submitterEmail.message}
          </p>
        )}
      </div>

      {mutation.isError && (
        <p className="text-sm text-destructive" role="alert">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "Failed to submit. Please try again."}
        </p>
      )}

      <Button type="submit" className="w-full h-11" disabled={mutation.isPending}>
        {mutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Submit Request
          </>
        )}
      </Button>
    </form>
  );
}

function DynamicIntakeForm({ projectId }: { projectId: string }) {
  const formQuery = useProjectIntakeForm(projectId);
  const form = formQuery.data;
  const token = form?.publicToken ?? "";
  const mutation = useSubmitPublicForm(token);

  const { handleSubmit, control, formState: { errors } } = useForm<Record<string, string>>({});

  const onSubmit = useCallback(
    (values: Record<string, string>) => {
      mutation.mutate(values);
    },
    [mutation],
  );

  if (formQuery.isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 bg-muted rounded animate-pulse w-24" />
            <div className="h-10 bg-muted rounded animate-pulse" />
          </div>
        ))}
        <div className="h-11 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (formQuery.isError || !form) {
    return null;
  }

  if (mutation.isSuccess) {
    return (
      <div className="text-center py-6 space-y-3">
        <div className="w-16 h-16 rounded-full bg-status-success-surface mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-status-success-ink" />
        </div>
        <p className="text-lg font-semibold text-foreground">Submission received</p>
        <p className="text-sm text-muted-foreground">
          Your response has been recorded. Thank you for taking the time to fill this out.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {form.fields.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          This form has no fields configured.
        </p>
      )}
      {form.fields.map((field) => {
        const error = errors[field.key];
        const errorMessage = typeof error?.message === "string" ? error.message : undefined;
        return (
          <Controller
            key={field.key}
            control={control}
            name={field.key}
            defaultValue=""
            render={({ field: controllerField }) => (
              <FieldInput
                field={field}
                value={controllerField.value ?? ""}
                onChange={controllerField.onChange}
                errorMessage={errorMessage}
              />
            )}
          />
        );
      })}
      {mutation.isError && (
        <p className="text-sm text-destructive" role="alert">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "Failed to submit. Please try again."}
        </p>
      )}
      {form.fields.length > 0 && (
        <Button type="submit" className="w-full h-11" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Submit
            </>
          )}
        </Button>
      )}
    </form>
  );
}

export default function PublicIntakePage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;

  const intakeFormQuery = useProjectIntakeForm(projectId);

  const title = intakeFormQuery.data?.name ?? "Submit a request";

  function renderForm() {
    if (intakeFormQuery.isLoading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 bg-muted rounded animate-pulse w-24" />
              <div className="h-10 bg-muted rounded animate-pulse" />
            </div>
          ))}
          <div className="h-11 bg-muted rounded animate-pulse" />
        </div>
      );
    }
    if (intakeFormQuery.isSuccess && intakeFormQuery.data) {
      return <DynamicIntakeForm projectId={projectId} />;
    }
    return <LegacyIntakeForm projectId={projectId} />;
  }

  return (
    <main className="min-h-dvh surface-soft flex items-start justify-center pt-8 sm:pt-12 px-4">
      <div className="w-full max-w-lg">
        <div className="gradient-brand text-white rounded-t-2xl px-6 py-8 text-center shadow-noir">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-white/80 text-sm mt-1">
            Fill in the details below and we&rsquo;ll review your request.
          </p>
        </div>

        <Card className="rounded-t-none border-t-0 px-6 py-6 shadow-noir">
          {renderForm()}
        </Card>
      </div>
    </main>
  );
}
