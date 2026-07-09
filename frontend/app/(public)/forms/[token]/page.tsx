"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle2, Send } from "lucide-react";
import { buildUrl } from "@/lib/api-client";

interface FormField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

interface PublicFormDefinition {
  id: number;
  name: string;
  description: string | null;
  type: string;
  fields: FormField[];
}

interface SubmitResponse {
  id: number;
  message: string;
}

async function fetchPublicForm(token: string): Promise<PublicFormDefinition> {
  const res = await fetch(buildUrl(`/public/forms/${token}`));
  if (!res.ok) {
    let message = "Form not found or no longer active.";
    try {
      const data = (await res.json()) as Record<string, unknown>;
      if (typeof data?.message === "string" && data.message && !data.message.startsWith(String(res.status))) {
        message = data.message;
      }
    } catch {
    }
    throw new Error(message);
  }
  return res.json() as Promise<PublicFormDefinition>;
}

async function submitPublicForm(
  token: string,
  values: Record<string, string>,
  submittedByName?: string,
): Promise<SubmitResponse> {
  const res = await fetch(buildUrl(`/public/forms/${token}/submit`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values, submittedByName }),
  });
  if (!res.ok) {
    let message = "Failed to submit. Please try again.";
    try {
      const data = (await res.json()) as Record<string, unknown>;
      if (typeof data?.message === "string" && data.message && !data.message.startsWith(String(res.status))) {
        message = data.message;
      } else if (Array.isArray(data?.message) && data.message.length > 0) {
        const msgs = data.message.filter((m): m is string => typeof m === "string");
        if (msgs.length > 0) message = msgs.join(", ");
      }
    } catch {
    }
    throw new Error(message);
  }
  return res.json() as Promise<SubmitResponse>;
}

function FieldInput({
  field,
  value,
  onChange,
  errorMessage,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
  errorMessage?: string;
}) {
  const handleSelectChange = useCallback(
    (v: string) => onChange(v),
    [onChange],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
    [onChange],
  );

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value),
    [onChange],
  );

  if (field.type === "select" && field.options && field.options.length > 0) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={`field-${field.key}`} className="text-xs">
          {field.label}
          {field.required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        <Select value={value} onValueChange={handleSelectChange}>
          <SelectTrigger id={`field-${field.key}`}>
            <SelectValue placeholder={`Select ${field.label.toLowerCase()}…`} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errorMessage && (
          <p className="text-xs text-destructive" role="alert">
            {errorMessage}
          </p>
        )}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={`field-${field.key}`} className="text-xs">
          {field.label}
          {field.required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        <Textarea
          id={`field-${field.key}`}
          rows={4}
          value={value}
          onChange={handleTextareaChange}
          aria-required={field.required}
          aria-invalid={errorMessage !== undefined}
        />
        {errorMessage && (
          <p className="text-xs text-destructive" role="alert">
            {errorMessage}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={`field-${field.key}`} className="text-xs">
        {field.label}
        {field.required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <Input
        id={`field-${field.key}`}
        type={field.type === "email" ? "email" : field.type === "number" ? "number" : "text"}
        value={value}
        onChange={handleInputChange}
        aria-required={field.required}
        aria-invalid={errorMessage !== undefined}
      />
      {errorMessage && (
        <p className="text-xs text-destructive" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

export default function PublicFormPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const formQuery = useQuery({
    queryKey: ["public-form", token],
    queryFn: () => fetchPublicForm(token),
    retry: false,
    staleTime: 60_000,
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<Record<string, string>>({
    defaultValues: {},
  });

  const mutation = useMutation({
    mutationFn: (values: Record<string, string>) => {
      const form = formQuery.data;
      if (!form) throw new Error("Form not loaded");
      const payload: Record<string, string> = {};
      for (const field of form.fields) {
        const val = values[field.key];
        if (val !== undefined) payload[field.key] = val;
      }
      return submitPublicForm(token, payload);
    },
  });

  const onSubmit = useCallback(
    (values: Record<string, string>) => {
      const form = formQuery.data;
      if (!form) return;
      const fieldErrors: Record<string, string> = {};
      for (const field of form.fields) {
        if (field.required && !values[field.key]?.trim()) {
          fieldErrors[field.key] = `${field.label} is required`;
        }
      }
      if (Object.keys(fieldErrors).length > 0) return;
      mutation.mutate(values);
    },
    [formQuery.data, mutation],
  );

  const form = formQuery.data;

  return (
    <main className="min-h-screen surface-soft flex items-start justify-center pt-8 sm:pt-12 px-4">
      <div className="w-full max-w-lg">
        <div className="gradient-brand text-white rounded-t-2xl px-6 py-8 text-center shadow-noir">
          <h1 className="text-2xl font-bold tracking-tight">
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
                  <div className="h-3 bg-slate-200 rounded animate-pulse w-24" />
                  <div className="h-10 bg-slate-200 rounded animate-pulse" />
                </div>
              ))}
              <div className="h-11 bg-slate-200 rounded animate-pulse" />
            </div>
          )}

          {formQuery.isError && (
            <div className="text-center py-8">
              <p className="text-lg font-semibold text-slate-700">Form unavailable</p>
              <p className="text-sm text-slate-500 mt-2">
                This form is not currently active or the link is invalid. Please contact the team for an
                up-to-date link.
              </p>
            </div>
          )}

          {mutation.isSuccess && (
            <div className="text-center py-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-lg font-semibold text-slate-900">Submission received</p>
              <p className="text-sm text-slate-500">
                Your response has been recorded. Thank you for taking the time to fill this out.
              </p>
            </div>
          )}

          {formQuery.isSuccess && form && !mutation.isSuccess && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              {form.fields.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">
                  This form has no fields configured.
                </p>
              )}

              {form.fields.map((field) => {
                const fieldValue = watch(field.key) ?? "";
                const error = errors[field.key];
                return (
                  <FieldInput
                    key={field.key}
                    field={field}
                    value={fieldValue}
                    onChange={(v) => setValue(field.key, v)}
                    errorMessage={typeof error?.message === "string" ? error.message : undefined}
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
          )}
        </Card>
      </div>
    </main>
  );
}
