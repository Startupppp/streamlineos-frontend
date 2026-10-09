"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
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
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCreateProfile, useCreateWorkerProfile, usePatchProfile, usePatchWorkerProfile } from "@/hooks/api/payroll/employees";
import { usePayrollWorkforceLabel } from "@/features/payroll/lib/payroll-workforce-label";
import { usePayrollPolicyCurrent } from "@/hooks/api/payroll/policies";
import type { ProfileDetail } from "@/hooks/api/payroll/employees-schema";
import type { PayrollPerson } from "@/hooks/api/payroll/people-schema";
import { PayrollPersonPicker, personKey } from "./payroll-person-picker";
import { SalaryBreakupPreview } from "@/features/payroll/salary-structures/salary-breakup-preview";
import { SALARY_PREVIEW_CTC } from "@/hooks/api/payroll/salary-preview";

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
  workerId?: string;
  open: boolean;
  onClose: () => void;
  existingProfile?: ProfileDetail | null;
}

export function SalaryProfileSheet({
  employeeUserId,
  workerId,
  open,
  onClose,
  existingProfile,
}: SalaryProfileSheetProps) {
  const [picked, setPicked] = useState<PayrollPerson | null>(null);

  const showPicker = !employeeUserId && !workerId;
  const pickedPayee = picked?.payee ?? null;
  const resolvedUserId = employeeUserId ?? (pickedPayee?.kind === "user" ? pickedPayee.userId : "");
  const resolvedWorkerId = workerId ?? (pickedPayee?.kind === "worker" ? pickedPayee.workerId : "");

  const isEdit = !!existingProfile;
  const workforceLabel = usePayrollWorkforceLabel();
  const { data: policyData } = usePayrollPolicyCurrent();
  const policyCurrency = policyData?.policy?.currency ?? "INR";
  const taxRegimeApplicable = policyData?.taxRegimeApplicable ?? true;
  const multiCurrency = policyData?.activeVersion?.toggles?.multiCurrency ?? false;
  const createMutation = useCreateProfile(resolvedUserId);
  const patchMutation = usePatchProfile(resolvedUserId);
  const createWorkerMutation = useCreateWorkerProfile(resolvedWorkerId);
  const patchWorkerMutation = usePatchWorkerProfile(resolvedWorkerId);

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

  const [showBreakup, setShowBreakup] = useState(false);
  const annualCtcValue = form.watch("annualCtc");
  const taxRegimeValue = form.watch("taxRegime");
  const workerTypeValue = form.watch("workerType");
  const canPreviewBreakup = Boolean(resolvedUserId || resolvedWorkerId) && SALARY_PREVIEW_CTC.test(annualCtcValue);

  function handleToggleBreakup() {
    setShowBreakup((shown) => !shown);
  }

  useEffect(() => {
    if (open && !employeeUserId && !workerId) setPicked(null);
  }, [employeeUserId, open, workerId]);

  useEffect(() => {
    if (open) {
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
  }, [open, existingProfile, form, policyCurrency]);

  function handleSubmit(values: ProfileForm) {
    if (!resolvedUserId && !resolvedWorkerId) {
      toast.error(`Please select a ${workforceLabel.singularLower}`);
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
      const onSuccess = () => {
        toast.success("Profile updated");
        onClose();
      };
      const onError = () => toast.error("Failed to update profile");
      if (resolvedWorkerId && !resolvedUserId) {
        patchWorkerMutation.mutate(
          { profileId: existingProfile.id, body: payload },
          { onSuccess, onError },
        );
      } else {
        patchMutation.mutate(
          { profileId: existingProfile.id, body: payload },
          { onSuccess, onError },
        );
      }
    } else {
      const onSuccess = () => {
        toast.success("Profile created");
        onClose();
      };
      const onError = () => toast.error("Failed to create profile");
      if (resolvedWorkerId && !resolvedUserId) {
        createWorkerMutation.mutate(payload, { onSuccess, onError });
      } else {
        createMutation.mutate(payload, { onSuccess, onError });
      }
    }
  }

  const isPending =
    createMutation.isPending ||
    patchMutation.isPending ||
    createWorkerMutation.isPending ||
    patchWorkerMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="p-0 flex flex-col gap-0 overflow-hidden sm:max-w-lg">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle className="text-sm font-semibold">
            {isEdit ? "Edit Salary Profile" : "Create Salary Profile"}
          </SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col flex-1 min-h-0 overflow-hidden"
          >
            <SheetBody className="px-6 py-4 space-y-3">
              {showPicker && (
                <FormItem>
                  <FormLabel>{workforceLabel.singular} *</FormLabel>
                  <PayrollPersonPicker
                    enabled={open}
                    selectedKey={picked ? personKey(picked) : null}
                    onPick={setPicked}
                    label={workforceLabel.plural}
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
                        <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="text-sm" />
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
              {canPreviewBreakup ? (
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    aria-expanded={showBreakup}
                    onClick={handleToggleBreakup}
                  >
                    {showBreakup ? "Hide monthly breakup" : "See monthly breakup"}
                  </Button>
                  {showBreakup ? (
                    <SalaryBreakupPreview
                      annualCtc={annualCtcValue}
                      regime={taxRegimeValue === "none" ? undefined : taxRegimeValue}
                      workerType={workerTypeValue}
                    />
                  ) : null}
                </div>
              ) : null}
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
                      <p className="text-dense text-muted-foreground mt-1">
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
            </SheetBody>
            <SheetFooter className="border-t px-6 py-4 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                size="sm"
                disabled={showPicker && !pickedPayee}
                isPending={isPending}
                loadingText={isEdit ? "Updating…" : "Creating…"}
              >
                {isEdit ? "Update" : "Create"}
              </LoadingButton>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
