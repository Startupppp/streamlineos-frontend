"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
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
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { useOrgMembers } from "@/hooks/api/organization";
import { useCreateProfile, usePatchProfile } from "@/hooks/api/payroll/employees";
import { usePayrollPolicyCurrent } from "@/hooks/api/payroll/policies";
import type { EmployeeSalaryProfile } from "@/types/payroll/runs";

const profileSchema = z.object({
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Required: YYYY-MM-DD"),
  annualCtc: z.string().regex(/^\d+(\.\d{1,2})?$/, "Positive decimal required"),
  workerType: z.enum(["EMPLOYEE", "CONTRACTOR", "CONSULTANT", "INTERN", "EOR"]),
  currency: z.string().length(3),
  payoutCurrency: z.string().refine((v) => !v || v.length === 3, "Must be a 3-letter currency code"),
  taxRegime: z.enum(["OLD", "NEW", "none"]),
  costCenter: z.string().max(100),
});
type ProfileForm = z.infer<typeof profileSchema>;

interface SalaryProfileSheetProps {
  employeeUserId?: string;
  open: boolean;
  onClose: () => void;
  existingProfile?: EmployeeSalaryProfile | null;
}

export function SalaryProfileSheet({
  employeeUserId,
  open,
  onClose,
  existingProfile,
}: SalaryProfileSheetProps) {
  const [pickedUserId, setPickedUserId] = useState("");

  const showPicker = !employeeUserId;
  const resolvedUserId = employeeUserId ?? pickedUserId;

  const isEdit = !!existingProfile;
  const { data: policyData } = usePayrollPolicyCurrent();
  const policyCurrency = policyData?.policy?.currency ?? "INR";
  const taxRegimeApplicable = policyData?.taxRegimeApplicable ?? true;
  const multiCurrency = policyData?.activeVersion?.toggles?.multiCurrency ?? false;
  const createMutation = useCreateProfile(resolvedUserId);
  const patchMutation = usePatchProfile(resolvedUserId);

  const { data: membersData } = useOrgMembers(1, 100, undefined, {
    enabled: showPicker && open,
    staleTime: 2 * 60_000,
  });

  const memberOptions = useMemo<ComboboxOption[]>(
    () =>
      (membersData?.data ?? []).map((m) => ({
        value: m.userId,
        label: m.name ?? m.email,
        sublabel: m.email,
      })),
    [membersData],
  );

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      effectiveFrom: "",
      annualCtc: "",
      workerType: "EMPLOYEE",
      currency: policyCurrency,
      payoutCurrency: "",
      taxRegime: "none",
      costCenter: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (!employeeUserId) setPickedUserId("");
      form.reset({
        effectiveFrom: existingProfile?.effectiveFrom ?? "",
        annualCtc: existingProfile?.annualCtc ?? "",
        workerType: existingProfile?.workerType ?? "EMPLOYEE",
        currency: existingProfile?.currency ?? policyCurrency,
        payoutCurrency: existingProfile?.payoutCurrency ?? "",
        taxRegime: (existingProfile?.taxRegime as "OLD" | "NEW" | undefined) ?? "none",
        costCenter: existingProfile?.costCenter ?? "",
      });
    }
  }, [open, existingProfile, form, employeeUserId]);

  function handleSubmit(values: ProfileForm) {
    if (!resolvedUserId) {
      toast.error("Please select an employee");
      return;
    }

    const payload = {
      effectiveFrom: values.effectiveFrom,
      annualCtc: values.annualCtc,
      workerType: values.workerType,
      currency: values.currency,
      payoutCurrency: values.payoutCurrency || undefined,
      taxRegime: values.taxRegime === "none" ? undefined : values.taxRegime,
      costCenter: values.costCenter || undefined,
    };

    if (isEdit && existingProfile) {
      patchMutation.mutate(
        { profileId: existingProfile.id, body: payload },
        {
          onSuccess: () => { toast.success("Profile updated"); onClose(); },
          onError: () => toast.error("Failed to update profile"),
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => { toast.success("Profile created"); onClose(); },
        onError: () => toast.error("Failed to create profile"),
      });
    }
  }

  const isPending = createMutation.isPending || patchMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="p-0 flex flex-col sm:max-w-lg">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle className="text-sm font-semibold">
            {isEdit ? "Edit Salary Profile" : "Create Salary Profile"}
          </SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {showPicker && (
                <FormItem>
                  <FormLabel>Employee *</FormLabel>
                  <Combobox
                    options={memberOptions}
                    value={pickedUserId}
                    onChange={setPickedUserId}
                    placeholder="Select employee…"
                    searchPlaceholder="Search by name or email…"
                  />
                </FormItem>
              )}
              {!isEdit && (
                <FormField
                  control={form.control}
                  name="effectiveFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Effective From *</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="annualCtc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Annual CTC *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. 1200000.00" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="workerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Worker Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EMPLOYEE">Employee</SelectItem>
                        <SelectItem value="CONTRACTOR">Contractor</SelectItem>
                        <SelectItem value="CONSULTANT">Consultant</SelectItem>
                        <SelectItem value="INTERN">Intern</SelectItem>
                        <SelectItem value="EOR">EOR</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="INR" maxLength={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {multiCurrency && (
                <FormField
                  control={form.control}
                  name="payoutCurrency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payout Currency</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. USD" maxLength={3} />
                      </FormControl>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Override payout currency for FX conversion (leave blank to use salary currency)
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {taxRegimeApplicable && (
                <FormField
                  control={form.control}
                  name="taxRegime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Regime</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Not specified" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Not specified</SelectItem>
                          <SelectItem value="NEW">New Regime</SelectItem>
                          <SelectItem value="OLD">Old Regime</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="costCenter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Center</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. ENG, SALES" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2 shrink-0">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending || (showPicker && !pickedUserId)}
              >
                {isEdit ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
