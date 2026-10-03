"use client";

import type { ChangeEvent, ComponentProps } from "react";
import type { UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdatePayrollEntity, type PayrollEntity } from "@/hooks/api/payroll/entities";
import {
  INDIAN_STATE_CODES,
  changedFilingFields,
  entityFilingSchema,
  toFilingForm,
  type EntityFilingForm,
} from "./entity-filing-schema";

const NOT_SET = "none";

type CodeTextField = "pan" | "tan" | "pfEstablishmentCode" | "esiCode";

const TEXT_FIELDS: ReadonlyArray<{ name: CodeTextField; label: string; placeholder: string }> = [
  { name: "pan", label: "PAN", placeholder: "ABCDE1234F" },
  { name: "tan", label: "TAN (for TDS)", placeholder: "ABCD12345E" },
  { name: "pfEstablishmentCode", label: "PF establishment code", placeholder: "MHBAN0012345000" },
  { name: "esiCode", label: "ESI employer code", placeholder: "17 digits" },
];

interface EntityFilingSheetProps {
  entity: PayrollEntity;
  onClose: () => void;
}

export function EntityFilingSheet({ entity, onClose }: EntityFilingSheetProps) {
  const mutation = useUpdatePayrollEntity(entity.id);
  const initial = toFilingForm(entity);

  function handleOpenChange(next: boolean) {
    if (!next) onClose();
  }

  function handleSubmit(values: EntityFilingForm) {
    const patch = changedFilingFields(initial, values);
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    mutation.mutate(patch, {
      onSuccess: () => {
        toast.success("Filing details saved");
        onClose();
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  return (
    <EntityFormSheet
      open
      onOpenChange={handleOpenChange}
      title="Edit filing details"
      description={entity.legalName}
      resolver={zodResolver(entityFilingSchema)}
      defaultValues={initial}
      onSubmit={handleSubmit}
      isSubmitting={mutation.isPending}
    >
      {(form) => <FilingFields form={form} />}
    </EntityFormSheet>
  );
}

function FilingFields({ form }: { form: UseFormReturn<EntityFilingForm> }) {
  return (
    <>
      <FormField
        control={form.control}
        name="legalName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Legal name</FormLabel>
            <FormControl>
              <Input {...field} maxLength={200} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {TEXT_FIELDS.map((spec) => (
        <FormField
          key={spec.name}
          control={form.control}
          name={spec.name}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{spec.label}</FormLabel>
              <FormControl>
                <UppercaseInput {...field} placeholder={spec.placeholder} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
      <FormField
        control={form.control}
        name="ptStateCode"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Professional tax state</FormLabel>
            <StateSelect value={field.value} onChange={field.onChange} />
            <FormDescription>Used to work out professional tax for this entity&apos;s employees.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="stateCode"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Registered state</FormLabel>
            <StateSelect value={field.value} onChange={field.onChange} />
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

interface UppercaseInputProps extends Omit<ComponentProps<typeof Input>, "onChange"> {
  onChange: (value: string) => void;
}

function UppercaseInput({ onChange, ...props }: UppercaseInputProps) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value.toUpperCase());
  }

  return <Input {...props} onChange={handleChange} autoComplete="off" />;
}

function StateSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  function handleChange(next: string) {
    onChange(next === NOT_SET ? "" : next);
  }

  return (
    <Select value={value === "" ? NOT_SET : value} onValueChange={handleChange}>
      <FormControl>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        <SelectItem value={NOT_SET}>Not set</SelectItem>
        {INDIAN_STATE_CODES.map((s) => (
          <SelectItem key={s.code} value={s.code}>
            {s.name} ({s.code})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
