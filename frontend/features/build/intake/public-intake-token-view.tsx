"use client";

import { useCallback } from "react";
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
  INTAKE_PRIORITY_OPTIONS,
  INTAKE_REQUEST_TYPE_OPTIONS,
} from "@/features/build/intake/public-intake-schema";
import { useSubmitIntakeByToken } from "@/hooks/api/build/public-intake";
import { getErrorMessage } from "@/lib/get-error-message";

interface IntakeTokenFormProps {
  intakeToken: string;
}

function IntakeTokenForm({ intakeToken }: IntakeTokenFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<IntakeFormValues>({
    resolver: zodResolver(intakeFormSchema),
  });

  const mutation = useSubmitIntakeByToken(intakeToken);

  const handleFormSubmit = useCallback(
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
        <p className="text-lg font-medium text-foreground">Request submitted</p>
        <p className="text-sm text-muted-foreground">
          Your request has been received and will be reviewed by the team. Thank you for reaching out.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5" noValidate>
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
                  {INTAKE_REQUEST_TYPE_OPTIONS.map((opt) => (
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
                  {INTAKE_PRIORITY_OPTIONS.map((opt) => (
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
          {getErrorMessage(mutation.error)}
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

interface PublicIntakeTokenViewProps {
  intakeToken: string;
}

export function PublicIntakeTokenView({ intakeToken }: PublicIntakeTokenViewProps) {
  return (
    <main className="min-h-dvh surface-soft flex items-start justify-center pt-8 sm:pt-12 px-4">
      <div className="w-full max-w-lg">
        <div className="gradient-brand text-white rounded-t-2xl px-6 py-8 text-center shadow-noir">
          <h1 className="text-2xl font-semibold tracking-tight">Submit a request</h1>
          <p className="text-white/80 text-sm mt-1">
            Fill in the details below and we&rsquo;ll review your request.
          </p>
        </div>

        <Card className="rounded-t-none border-t-0 px-6 py-6 shadow-noir">
          <IntakeTokenForm intakeToken={intakeToken} />
        </Card>
      </div>
    </main>
  );
}
