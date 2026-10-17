"use client";

import { useCallback, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { CheckCircle2, Send } from "lucide-react";
import { buildDynamicSchema } from "@/features/build/forms/form-submission-schema";
import { usePublicForm, useSubmitPublicForm } from "@/hooks/api/build/public-form";
import { FieldInput } from "@/features/build/forms/field-input";
import { PublicSurfacePanel } from "@/features/build/forms/public-surface-panel";
import {
  classifyPublicFormSubmitFailure,
  classifyPublicReadFailure,
} from "@/features/build/forms/public-surface-states";

interface PublicFormViewProps {
  formToken: string;
}

export function PublicFormView({ formToken }: PublicFormViewProps) {
  const formQuery = usePublicForm(formToken);

  const fields = useMemo(() => formQuery.data?.fields ?? [], [formQuery.data]);

  const schema = useMemo(() => buildDynamicSchema(fields), [fields]);

  const defaultValues = useMemo<Record<string, unknown>>(() => {
    const vals: Record<string, unknown> = {};
    for (const f of fields) {
      vals[f.key] = "";
    }
    return vals;
  }, [fields]);

  const { control, handleSubmit, formState: { errors } } = useForm<Record<string, unknown>>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const mutation = useSubmitPublicForm(formToken);

  const form = formQuery.data;

  const readFailure = useMemo(
    () => (formQuery.isError ? classifyPublicReadFailure(formQuery.error) : undefined),
    [formQuery.isError, formQuery.error],
  );

  const submitFailure = useMemo(
    () => (mutation.isError ? classifyPublicFormSubmitFailure(mutation.error) : undefined),
    [mutation.isError, mutation.error],
  );

  const reference = mutation.data?.id;

  const refetchForm = formQuery.refetch;

  const handleRetryRead = useCallback(() => {
    void refetchForm();
  }, [refetchForm]);

  const handleFormSubmit = useCallback(
    (values: Record<string, unknown>) => {
      if (!form || mutation.isPending || mutation.isSuccess) return;
      const payload: Record<string, unknown> = {};
      for (const field of form.fields) {
        const val = values[field.key];
        if (val !== undefined) payload[field.key] = val;
      }
      mutation.mutate(payload);
    },
    [mutation, form],
  );

  return (
    <main className="min-h-dvh surface-soft flex items-start justify-center pt-8 sm:pt-12 px-4">
      <div className="w-full max-w-lg">
        <div className="gradient-brand text-white rounded-t-2xl px-6 py-8 text-center shadow-noir">
          <h1 className="text-2xl font-semibold tracking-tight">
            {mutation.isSuccess ? "Submitted!" : (form?.name ?? "Loading form…")}
          </h1>
          {form?.description && !mutation.isSuccess && (
            <p className="text-white/80 text-sm mt-1">{form.description}</p>
          )}
        </div>

        <Card className="rounded-t-none border-t-0 px-6 py-6 shadow-noir">
          {formQuery.isLoading && (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3 bg-muted rounded animate-pulse w-24" />
                  <div className="h-10 bg-muted rounded animate-pulse" />
                </div>
              ))}
              <div className="h-11 bg-muted rounded animate-pulse" />
            </div>
          )}

          {readFailure && (
            <PublicSurfacePanel
              failure={readFailure}
              onRetry={handleRetryRead}
            />
          )}

          {mutation.isSuccess && (
            <div className="text-center py-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-status-success-surface mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-status-success-ink" />
              </div>
              <p className="text-lg font-medium text-foreground">Submission received</p>
              <p className="text-sm text-muted-foreground">
                Your response has been recorded. Thank you for taking the time to fill this out.
              </p>
              {reference !== undefined && (
                <p className="text-sm text-muted-foreground">
                  Your reference is{" "}
                  <span className="font-mono tabular-nums font-medium text-foreground">
                    #{reference}
                  </span>
                  . Quote it if you need to follow this up.
                </p>
              )}
            </div>
          )}

          {formQuery.isSuccess && form && !mutation.isSuccess && (
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5" noValidate>
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
                        value={typeof controllerField.value === "string" ? controllerField.value : ""}
                        onChange={controllerField.onChange}
                        errorMessage={errorMessage}
                      />
                    )}
                  />
                );
              })}

              {submitFailure && (
                <div className="space-y-1" role="alert">
                  <p className="text-sm font-medium text-destructive">
                    {submitFailure.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {submitFailure.description}
                  </p>
                </div>
              )}

              {form.fields.length > 0 && submitFailure?.kind !== "dead-link" && (
                <LoadingButton
                  type="submit"
                  className="w-full h-11"
                  isPending={mutation.isPending}
                  loadingText="Submitting…"
                >
                  <Send className="h-4 w-4" />
                  Submit
                </LoadingButton>
              )}
            </form>
          )}
        </Card>
      </div>
    </main>
  );
}
