"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  bankDetailsSchema,
  type BankDetailsFormValues,
} from "../lib/bank-details-schema";
import {
  EMPTY_BANK_DRAFT,
  type BankDraft,
} from "../lib/wizard-draft-schema";
import { FieldError } from "./field-error";
import { NavButtons } from "./nav-buttons";
import { StepBody } from "./step-body";

type StepBankProps = {
  onComplete: (values: BankDraft) => void;
  onDraftChange?: (values: BankDraft) => void;
  onClear?: () => void;
  onBack: () => void;
  defaultValues?: BankDraft;
};

function toBankDraft(values: BankDetailsFormValues): BankDraft {
  return {
    accountHolder: values.accountHolder ?? "",
    bankName: values.bankName ?? "",
    accountNumber: values.accountNumber ?? "",
    ifsc: values.ifsc ?? "",
    taxId: values.taxId ?? "",
  };
}

export function StepBank({
  onComplete,
  onDraftChange,
  onClear,
  onBack,
  defaultValues,
}: StepBankProps) {
  const form = useForm<BankDetailsFormValues>({
    resolver: zodResolver(bankDetailsSchema),
    mode: "onChange",
    defaultValues: {
      ...EMPTY_BANK_DRAFT,
      ...defaultValues,
    },
  });

  const { errors } = form.formState;

  useEffect(() => {
    if (!onDraftChange) return;
    const subscription = form.watch((values) => {
      onDraftChange({
        accountHolder: values.accountHolder ?? "",
        bankName: values.bankName ?? "",
        accountNumber: values.accountNumber ?? "",
        ifsc: values.ifsc ?? "",
        taxId: values.taxId ?? "",
      });
    });
    return () => subscription.unsubscribe();
  }, [form, onDraftChange]);

  function handleFormSubmit(values: BankDetailsFormValues) {
    toast.success("Bank details saved");
    onComplete(toBankDraft(values));
  }

  function handleNextClick() {
    void form.handleSubmit(handleFormSubmit)();
  }

  function handleClear() {
    form.reset({ ...EMPTY_BANK_DRAFT });
    onClear?.();
  }

  function handleIfscChange(e: React.ChangeEvent<HTMLInputElement>) {
    form.setValue("ifsc", e.target.value.toUpperCase(), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function handleTaxIdChange(e: React.ChangeEvent<HTMLInputElement>) {
    form.setValue("taxId", e.target.value.toUpperCase(), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

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
          <div className="space-y-1.5">
            <Label htmlFor="accountHolder">Account holder name</Label>
            <Input
              id="accountHolder"
              {...form.register("accountHolder")}
              placeholder="Name as on the bank account"
              autoComplete="name"
              aria-required="true"
              aria-invalid={!!errors.accountHolder}
              aria-describedby={
                errors.accountHolder ? "accountHolder-error" : undefined
              }
            />
            {errors.accountHolder ? (
              <p
                id="accountHolder-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {errors.accountHolder.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bankName">Bank name</Label>
            <Input
              id="bankName"
              {...form.register("bankName")}
              placeholder="HDFC, SBI, etc."
              aria-required="true"
              aria-invalid={!!errors.bankName}
            />
            <FieldError message={errors.bankName?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="accountNumber">Account number</Label>
            <Input
              id="accountNumber"
              type="text"
              {...form.register("accountNumber")}
              placeholder="00000000000"
              maxLength={20}
              inputMode="numeric"
              autoComplete="off"
              aria-required="true"
              aria-invalid={!!errors.accountNumber}
            />
            <FieldError message={errors.accountNumber?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ifsc">IFSC code</Label>
            <Input
              id="ifsc"
              {...form.register("ifsc", { onChange: handleIfscChange })}
              placeholder="HDFC0001234"
              aria-required="true"
              aria-invalid={!!errors.ifsc}
              className="uppercase"
              autoCapitalize="characters"
              spellCheck={false}
            />
            <FieldError message={errors.ifsc?.message} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="taxId">
            Tax ID (PAN / SSN){" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="taxId"
            {...form.register("taxId", { onChange: handleTaxIdChange })}
            placeholder="ABCDE1234F"
            aria-describedby="taxId-hint"
            className="uppercase"
            autoCapitalize="characters"
            spellCheck={false}
          />
          <p id="taxId-hint" className="text-xs text-muted-foreground">
            Used for payroll and tax compliance.
          </p>
          <FieldError message={errors.taxId?.message} />
        </div>
      </StepBody>
    </form>
  );
}
