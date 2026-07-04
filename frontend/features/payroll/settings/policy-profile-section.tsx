"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PageSection } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MonthPicker } from "@/features/payroll/shared";
import { useUpdatePolicy } from "@/hooks/api/payroll";
import { CURRENCIES, PAY_FREQUENCIES } from "@/features/payroll/setup/lib/constants";
import type { PolicyRow, PayFrequency } from "@/types/payroll/setup";

const schema = z.object({
  legalEntityName: z.string().optional(),
  currency: z.string().min(1),
  payFrequency: z.enum(["MONTHLY", "SEMI_MONTHLY", "BI_WEEKLY", "WEEKLY"]),
  payDay: z.string().min(1),
  startMonth: z.string().min(1),
});
type ProfileForm = z.infer<typeof schema>;

const ORDINAL_SUFFIX = ["st", "nd", "rd"];

function ordinal(n: number): string {
  return `${n}${ORDINAL_SUFFIX[n - 1] ?? "th"}`;
}

type PolicyProfileSectionProps = {
  policy: PolicyRow;
};

export function PolicyProfileSection({ policy }: PolicyProfileSectionProps) {
  const [editing, setEditing] = useState(false);
  const update = useUpdatePolicy();

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } =
    useForm<ProfileForm>({
      resolver: zodResolver(schema),
      defaultValues: {
        legalEntityName: policy.legalEntityName ?? "",
        currency: policy.currency,
        payFrequency: policy.payFrequency,
        payDay: String(policy.payDay),
        startMonth: policy.startMonth,
      },
    });

  function handleFrequencyChange(val: string) {
    const match = PAY_FREQUENCIES.find((f) => f.value === val);
    if (match) setValue("payFrequency", match.value);
  }

  function handleCurrencyChange(val: string) {
    setValue("currency", val);
  }

  function handlePayDayChange(val: string) {
    setValue("payDay", val);
  }

  function onSubmit(data: ProfileForm) {
    update.mutate(
      {
        policyId: policy.id,
        data: {
          legalEntityName: data.legalEntityName || undefined,
          currency: data.currency,
          payFrequency: data.payFrequency,
          payDay: parseInt(data.payDay, 10),
          startMonth: data.startMonth,
        },
      },
      {
        onSuccess: () => {
          toast.success("Policy updated");
          setEditing(false);
        },
        onError: () => toast.error("Failed to update policy"),
      },
    );
  }

  function handleCancel() {
    reset();
    setEditing(false);
  }

  const displayRows: [string, string][] = [
    ["Country", policy.country],
    ["Currency", policy.currency],
    ["Pay Frequency", policy.payFrequency.replace(/_/g, " ")],
    ["Pay Day", `${ordinal(policy.payDay)} of month`],
    ["Start Month", policy.startMonth],
    ["Legal Entity", policy.legalEntityName ?? "—"],
  ];

  if (!editing) {
    return (
      <PageSection
        title="Policy Profile"
        description="Basic payroll configuration for your organisation"
        actions={
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        }
      >
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {displayRows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="font-medium mt-0.5">{value}</dd>
            </div>
          ))}
        </dl>
      </PageSection>
    );
  }

  return (
    <PageSection title="Policy Profile" description="Update your payroll configuration">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Legal Entity Name</Label>
            <Input {...register("legalEntityName")} className="h-8 text-sm" />
            {errors.legalEntityName && (
              <p className="text-xs text-destructive">{errors.legalEntityName.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Currency</Label>
            <Select value={watch("currency")} onValueChange={handleCurrencyChange}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Pay Frequency</Label>
            <Select value={watch("payFrequency")} onValueChange={handleFrequencyChange}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAY_FREQUENCIES.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Pay Day</Label>
            <Select value={watch("payDay")} onValueChange={handlePayDayChange}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 28 }, (_, i) => String(i + 1)).map((d) => (
                  <SelectItem key={d} value={d}>
                    {ordinal(Number(d))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Start Month</Label>
            <MonthPicker
              value={watch("startMonth")}
              onChange={(val) => setValue("startMonth", val)}
              className="h-8"
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>
    </PageSection>
  );
}
