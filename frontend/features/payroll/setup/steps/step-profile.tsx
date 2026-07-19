"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { MonthPicker } from "@/features/payroll/shared";
import { NavButtons } from "@/features/payroll/setup/nav-buttons";
import { useCreatePolicy, useUpdatePolicy } from "@/hooks/api/payroll";
import { CURRENCIES, PAY_FREQUENCIES } from "@/features/payroll/setup/lib/constants";
import type { SetupDraft } from "@/features/payroll/setup/lib/draft";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

const COUNTRY_DEFAULT_CURRENCY: Record<string, string> = {
  IN: "INR",
  US: "USD",
  GB: "GBP",
  AE: "AED",
  SG: "SGD",
  AU: "AUD",
};

const COUNTRIES: ComboboxOption[] = [
  { value: "IN", label: "India" }, { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" }, { value: "AE", label: "United Arab Emirates" },
  { value: "SG", label: "Singapore" }, { value: "AU", label: "Australia" },
  { value: "CA", label: "Canada" }, { value: "DE", label: "Germany" },
  { value: "FR", label: "France" }, { value: "NL", label: "Netherlands" },
  { value: "MY", label: "Malaysia" }, { value: "PH", label: "Philippines" },
  { value: "NZ", label: "New Zealand" }, { value: "ZA", label: "South Africa" },
  { value: "NG", label: "Nigeria" }, { value: "KE", label: "Kenya" },
  { value: "BD", label: "Bangladesh" }, { value: "PK", label: "Pakistan" },
  { value: "LK", label: "Sri Lanka" }, { value: "NP", label: "Nepal" },
];

const PAY_DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => {
  const day = i + 1;
  const suffix = day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th";
  return { value: String(day), label: `${day}${suffix}` };
});

const schema = z.object({
  country: z.string().min(1, "Country is required"),
  state: z.string().optional(),
  legalEntityName: z.string().optional(),
  currency: z.string().min(1, "Currency is required"),
  payFrequency: z.enum(["MONTHLY", "SEMI_MONTHLY", "BI_WEEKLY", "WEEKLY"]),
  payDay: z.string().min(1, "Pay day is required"),
  startMonth: z.string().min(1, "Start month is required"),
  employeeCount: z.string().optional().refine(
    (v) => !v || (Number.isFinite(Number(v)) && Number(v) > 0 && Number.isInteger(Number(v))),
    { message: "Must be a positive whole number" },
  ),
});

type ProfileForm = z.infer<typeof schema>;

type StepProfileProps = {
  draft: SetupDraft;
  updateDraft: (p: Partial<SetupDraft>) => void;
  goNext: () => void;
};

export function StepProfile({ draft, updateDraft, goNext }: StepProfileProps) {
  const createPolicy = useCreatePolicy();
  const updatePolicy = useUpdatePolicy();

  const form = useForm<ProfileForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      country: draft.profile?.country ?? "",
      state: draft.profile?.state ?? "",
      legalEntityName: draft.profile?.legalEntityName ?? "",
      currency: draft.profile?.currency ?? "INR",
      payFrequency: draft.profile?.payFrequency ?? "MONTHLY",
      payDay: draft.profile?.payDay ? String(draft.profile.payDay) : "1",
      startMonth: draft.profile?.startMonth ?? "",
      employeeCount: draft.profile?.employeeCount != null ? String(draft.profile.employeeCount) : "",
    },
  });

  const isPending = createPolicy.isPending || updatePolicy.isPending;

  function handleFrequencyClick(value: ProfileForm["payFrequency"]) {
    form.setValue("payFrequency", value, { shouldValidate: true });
  }

  function handleSubmit(data: ProfileForm) {
    const payload = {
      country: data.country,
      state: data.state || undefined,
      legalEntityName: data.legalEntityName || undefined,
      currency: data.currency,
      payFrequency: data.payFrequency,
      payDay: parseInt(data.payDay, 10),
      startMonth: data.startMonth,
      employeeCount: data.employeeCount ? parseInt(data.employeeCount, 10) : undefined,
    };

    const profileDraft: SetupDraft["profile"] = {
      country: data.country,
      state: data.state || undefined,
      legalEntityName: data.legalEntityName || undefined,
      currency: data.currency,
      payFrequency: data.payFrequency,
      payDay: parseInt(data.payDay, 10),
      startMonth: data.startMonth,
      employeeCount: data.employeeCount ? parseInt(data.employeeCount, 10) : undefined,
    };

    if (draft.policyId) {
      updatePolicy.mutate(
        { policyId: draft.policyId, data: payload },
        {
          onSuccess: () => {
            updateDraft({ profile: profileDraft });
            goNext();
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    } else {
      createPolicy.mutate(payload, {
        onSuccess: (result) => {
          updateDraft({ policyId: result.id, profile: profileDraft });
          goNext();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    }
  }

  const watchFrequency = form.watch("payFrequency");
  const watchCountry = form.watch("country");

  useEffect(() => {
    const defaultCurrency = COUNTRY_DEFAULT_CURRENCY[watchCountry];
    if (defaultCurrency) {
      form.setValue("currency", defaultCurrency, { shouldValidate: false });
    }
  }, [watchCountry, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Combobox
                    options={COUNTRIES}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select country"
                    searchPlaceholder="Search countries…"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State / Province</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Maharashtra" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="legalEntityName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Legal Entity Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Acme Pvt Ltd" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="payFrequency"
            render={() => (
              <FormItem>
                <FormLabel>Pay Frequency</FormLabel>
                <FormControl>
                  <div className="flex rounded-md border border-border overflow-hidden">
                    {PAY_FREQUENCIES.map(({ value, label }, idx) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleFrequencyClick(value)}
                        className={cn(
                          "flex-1 py-1.5 text-xs font-medium transition-colors",
                          idx > 0 && "border-l border-border",
                          watchFrequency === value
                            ? "bg-primary text-primary-foreground"
                            : "bg-card text-foreground hover:bg-muted",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="payDay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pay Day</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAY_DAY_OPTIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startMonth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Month</FormLabel>
                  <FormControl>
                    <MonthPicker
                      value={field.value}
                      onChange={field.onChange}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="employeeCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employee Count (optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 50"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <NavButtons onNext={form.handleSubmit(handleSubmit)} isLoading={isPending} />
      </form>
    </Form>
  );
}
