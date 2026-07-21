"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { WizardSectionHeading } from "@/components/wizard-shell";
import { useOnboardingRequirements } from "../hooks/use-onboarding-requirements";
import type { OnboardingRequirements } from "../lib/onboarding-requirements-schema";
import {
  buildBankDetailsSchema,
  type BankDetailsFormValues,
} from "../lib/bank-details-schema";
import { EMPTY_BANK_DRAFT, type BankDraft } from "../lib/wizard-draft-schema";
import { FieldError } from "./field-error";
import { NavButtons } from "./nav-buttons";
import { StepBody } from "./step-body";

type StepBankProps = {
  countryCode: string;
  onComplete: (values: BankDraft) => void;
  onDraftChange?: (values: BankDraft) => void;
  onClear?: () => void;
  onBack: () => void;
  defaultValues?: BankDraft;
};

function draftToForm(draft: BankDraft | undefined): BankDetailsFormValues {
  const d = draft ?? EMPTY_BANK_DRAFT;
  return {
    accountHolder: d.accountHolder,
    bankName: d.bankName,
    accountNumber: d.accountNumber,
    routingCode: d.routingCode,
    iban: d.iban,
    swift: d.swift,
    statutory: d.statutory ?? {},
  };
}

function formToBankDraft(
  values: BankDetailsFormValues,
  req: OnboardingRequirements,
): BankDraft {
  const bankValues: Record<string, string> = {};
  for (const field of req.bankFields) {
    const raw = values[field.key].trim();
    bankValues[field.key] = field.uppercase ? raw.toUpperCase() : raw;
  }
  const statutory: Record<string, string> = {};
  for (const field of req.statutoryFields) {
    const raw = (values.statutory[field.key] ?? "").trim();
    if (raw) statutory[field.key] = field.uppercase ? raw.toUpperCase() : raw;
  }
  return {
    countryCode: req.countryCode,
    accountHolder: bankValues.accountHolder ?? "",
    bankName: bankValues.bankName ?? "",
    accountNumber: bankValues.accountNumber ?? "",
    routingCode: bankValues.routingCode ?? "",
    iban: bankValues.iban ?? "",
    swift: bankValues.swift ?? "",
    statutory,
  };
}

function StepBankForm({
  requirements,
  onComplete,
  onDraftChange,
  onClear,
  onBack,
  defaultValues,
}: {
  requirements: OnboardingRequirements;
} & Omit<StepBankProps, "countryCode">) {
  const schema = useMemo(
    () => buildBankDetailsSchema(requirements),
    [requirements],
  );

  const form = useForm<BankDetailsFormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: draftToForm(defaultValues),
  });

  const { errors } = form.formState;

  useEffect(() => {
    if (!onDraftChange) return;
    const subscription = form.watch(() => {
      onDraftChange(formToBankDraft(form.getValues(), requirements));
    });
    return () => subscription.unsubscribe();
  }, [form, onDraftChange, requirements]);

  const handleFormSubmit = useCallback(
    (values: BankDetailsFormValues) => {
      toast.success("Bank details saved");
      onComplete(formToBankDraft(values, requirements));
    },
    [onComplete, requirements],
  );

  const handleNextClick = useCallback(() => {
    void form.handleSubmit(handleFormSubmit)();
  }, [form, handleFormSubmit]);

  const handleClear = useCallback(() => {
    form.reset(draftToForm(EMPTY_BANK_DRAFT));
    onClear?.();
  }, [form, onClear]);

  return (
    <form
      onSubmit={form.handleSubmit(handleFormSubmit)}
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col"
    >
      <StepBody
        footer={
          <NavButtons
            onBack={onBack}
            onNext={handleNextClick}
            nextType="submit"
            nextLabel="Save & continue"
            clearLabel="Clear"
            onClear={handleClear}
          />
        }
      >
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {requirements.bankFields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input
                id={field.key}
                {...form.register(field.key)}
                placeholder={field.placeholder}
                inputMode={field.key === "accountNumber" ? "numeric" : undefined}
                autoComplete="off"
                spellCheck={false}
                aria-required={field.required}
                aria-invalid={!!errors[field.key]}
                className={field.uppercase ? "uppercase" : undefined}
                autoCapitalize={field.uppercase ? "characters" : undefined}
              />
              {field.help ? (
                <p className="text-xs text-muted-foreground">{field.help}</p>
              ) : null}
              <FieldError message={errors[field.key]?.message} />
            </div>
          ))}
        </div>

        {requirements.statutoryFields.length > 0 ? (
          <section className="space-y-3">
            <WizardSectionHeading>Payroll &amp; statutory</WizardSectionHeading>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {requirements.statutoryFields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label htmlFor={`statutory-${field.key}`}>
                    {field.label}
                    {!field.required ? (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        (optional)
                      </span>
                    ) : null}
                  </Label>
                  <Input
                    id={`statutory-${field.key}`}
                    {...form.register(`statutory.${field.key}`)}
                    placeholder={field.placeholder}
                    autoComplete="off"
                    spellCheck={false}
                    aria-required={field.required}
                    aria-invalid={!!errors.statutory?.[field.key]}
                    className={field.uppercase ? "uppercase" : undefined}
                    autoCapitalize={field.uppercase ? "characters" : undefined}
                  />
                  {field.help ? (
                    <p className="text-xs text-muted-foreground">{field.help}</p>
                  ) : null}
                  <FieldError message={errors.statutory?.[field.key]?.message} />
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </StepBody>
    </form>
  );
}

export function StepBank({ countryCode, ...rest }: StepBankProps) {
  const { data: requirements, isLoading } = useOnboardingRequirements(countryCode);

  if (isLoading || !requirements) {
    return (
      <StepBody
        footer={
          <NavButtons
            onBack={rest.onBack}
            onNext={rest.onBack}
            nextLabel="Save & continue"
            nextDisabled
          />
        }
      >
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </StepBody>
    );
  }

  return <StepBankForm requirements={requirements} {...rest} />;
}
