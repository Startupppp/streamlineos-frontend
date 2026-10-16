"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { usePublicLeadForm, useSubmitLeadForm } from "@/hooks/api/crm/web-forms";
import type { PublicLeadForm, WebFormField } from "@/hooks/api/crm/web-forms-schema";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  buildLeadFormSchema,
  emptyLeadFormValues,
  safeRedirect,
  toLeadSubmission,
} from "./lead-form-schema";

interface PublicLeadFormProps {
  leadFormToken: string;
}

/** The page a visitor lands on from a shared or embedded web-form link. */
export function PublicLeadFormPage({ leadFormToken }: PublicLeadFormProps) {
  const form = usePublicLeadForm(leadFormToken);

  return (
    <main className="flex min-h-dvh items-start justify-center bg-background px-4 pt-8 sm:pt-12">
      <Card className="w-full max-w-lg p-6">
        {form.isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : form.data ? (
          <LeadFormBody leadFormToken={leadFormToken} definition={form.data} />
        ) : (
          <div className="py-8 text-center">
            <h1 className="text-lg font-semibold">Form unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This form is no longer accepting responses, or the link is wrong.
            </p>
          </div>
        )}
      </Card>
    </main>
  );
}

function LeadFormBody({
  leadFormToken,
  definition,
}: {
  leadFormToken: string;
  definition: PublicLeadForm;
}) {
  const submit = useSubmitLeadForm(leadFormToken);
  const schema = useMemo(() => buildLeadFormSchema(definition.fields), [definition.fields]);
  const defaults = useMemo(() => emptyLeadFormValues(definition.fields), [definition.fields]);
  const rhf = useForm<Record<string, string>>({ resolver: zodResolver(schema), defaultValues: defaults });

  const handleSubmit = rhf.handleSubmit((values) =>
    submit.mutate(toLeadSubmission(values), {
      onSuccess: (result) => {
        const target = safeRedirect(result.redirectUrl);
        if (target) window.location.assign(target);
      },
    }),
  );

  if (submit.isSuccess)
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-status-success-ink" aria-hidden />
        <h1 className="text-lg font-semibold">{submit.data.message}</h1>
      </div>
    );

  return (
    <Form {...rhf}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold">{definition.name}</h1>
        {definition.fields.map((field) => (
          <FormField
            key={field.name}
            control={rhf.control}
            name={field.name}
            render={({ field: control }) => (
              <FormItem>
                <FormLabel>{field.required ? `${field.label} *` : field.label}</FormLabel>
                <LeadFormControl field={field} value={control.value} onChange={control.onChange} onBlur={control.onBlur} />
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        {submit.error ? (
          <p role="alert" className="text-sm text-status-danger-ink">
            {getErrorMessage(submit.error)}
          </p>
        ) : null}
        <LoadingButton type="submit" isPending={submit.isPending}>
          Submit
        </LoadingButton>
      </form>
    </Form>
  );
}

interface LeadFormControlProps {
  field: WebFormField;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}

function LeadFormControl({ field, value, onChange, onBlur }: LeadFormControlProps) {
  if (field.type === "select")
    return (
      <Select value={value} onValueChange={onChange}>
        <FormControl>
          <SelectTrigger aria-label={field.label} onBlur={onBlur}>
            <SelectValue placeholder="Choose…" />
          </SelectTrigger>
        </FormControl>
        <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
          {(field.options ?? []).map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange(event.target.value);
  if (field.type === "textarea")
    return (
      <FormControl>
        <Textarea value={value} onChange={handleChange} onBlur={onBlur} rows={4} />
      </FormControl>
    );
  return (
    <FormControl>
      <Input
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        inputMode={field.type === "email" ? "email" : field.type === "phone" ? "tel" : undefined}
        autoComplete={field.type === "email" ? "email" : field.type === "phone" ? "tel" : undefined}
      />
    </FormControl>
  );
}
