"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PublicFormField } from "./components/public-form-field";
import { claimInvitation } from "./claim-client";

const schema = z.object({
  firstName: z.string().min(1, "Your first name is required").max(100),
  lastName: z.string().max(100).optional(),
  companyName: z.string().min(1, "Your organisation's name is required").max(200),
  country: z
    .string()
    .length(2, "Use a two-letter country code")
    .optional()
    .or(z.literal("")),
});

type Values = z.infer<typeof schema>;

/**
 * The form that turns an invitation into a workspace.
 *
 * The email address is deliberately absent: it comes from the waitlist entry the
 * token identifies, so somebody holding a token for one address cannot provision
 * a workspace for another. Asking for it again would invite exactly that.
 *
 * Country is asked because it decides which region the workspace is created in,
 * and that is set once and cannot be changed afterwards — so this is the only
 * moment it can be asked, and it is worth a sentence saying why.
 */
export function ClaimForm({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: "", lastName: "", companyName: "", country: "" },
  });

  function handleSubmit(values: Values) {
    setError(null);
    startTransition(async () => {
      const result = await claimInvitation({ token, ...values });
      if (result.ok) setDone(result.email);
      else setError(result.error);
    });
  }

  if (done) {
    return (
      <div className="rounded-xl border border-border bg-white p-6 text-center shadow-sm">
        <CheckCircle2 className="mx-auto h-8 w-8 text-status-success-ink" aria-hidden />
        <h2 className="mt-3 text-base font-semibold text-foreground">Your workspace is ready</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          It was created for <strong className="text-foreground">{done}</strong>. Sign in with
          that address to get started.
        </p>
        <a
          href="/signin"
          className="mt-5 inline-flex items-center rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          Sign in
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="space-y-4 rounded-xl border border-border bg-white p-6 shadow-sm"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <PublicFormField label="First name" error={form.formState.errors.firstName?.message}>
          <Input {...form.register("firstName")} autoComplete="given-name" />
        </PublicFormField>
        <PublicFormField label="Last name" error={form.formState.errors.lastName?.message}>
          <Input {...form.register("lastName")} autoComplete="family-name" />
        </PublicFormField>
      </div>

      <PublicFormField
        label="Organisation name"
        error={form.formState.errors.companyName?.message}
      >
        <Input {...form.register("companyName")} autoComplete="organization" />
      </PublicFormField>

      <div>
        <Label htmlFor="country" className="text-sm font-medium">
          Country
        </Label>
        <Input
          id="country"
          {...form.register("country")}
          placeholder="DE"
          maxLength={2}
          autoComplete="country"
          className="mt-1.5 uppercase"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          {/* Said here because it is the only moment it can be asked. */}
          Two-letter code. This decides which region your data is stored in, and it
          cannot be changed later.
        </p>
        {form.formState.errors.country?.message ? (
          <p className="mt-1 text-xs text-destructive">
            {form.formState.errors.country.message}
          </p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <LoadingButton type="submit" isPending={pending} loadingText="Creating…" className="w-full">
        Create my workspace
      </LoadingButton>
    </form>
  );
}
