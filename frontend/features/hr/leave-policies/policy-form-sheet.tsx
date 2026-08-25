"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { LoadingButton } from "@/components/ui/loading-button";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import { useUnsavedChangesGuard } from "@/hooks/common/use-unsaved-changes-guard";

import {
  useCreateLeavePolicy,
  useUpdateLeavePolicy,
  type LeavePolicy,
} from "@/hooks/api/hr/leave-policies";
import {
  useCreateLeaveType,
  useSeedLeaveTypes,
  useLeaveTypesAdmin,
} from "@/hooks/api/hr/leaves";

import { policySchema, type PolicyFormValues, emptyPolicyDefaults } from "@/features/hr/leave-policies/policy-schema";

interface PolicyFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPolicy: LeavePolicy | null;
  onCreated: () => void;
}

export function PolicyFormSheet({
  open,
  onOpenChange,
  editingPolicy,
  onCreated,
}: PolicyFormSheetProps) {
  const { data: leaveTypesData } = useLeaveTypesAdmin();
  const leaveTypeOptions = leaveTypesData ?? [];

  const createMutation = useCreateLeavePolicy();
  const updateMutation = useUpdateLeavePolicy();
  const createLeaveType = useCreateLeaveType();
  const seedLeaveTypes = useSeedLeaveTypes();

  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeDays, setNewTypeDays] = useState("12");

  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(policySchema),
    defaultValues: emptyPolicyDefaults,
  });

  const isDirty = form.formState.isDirty;

  const closeSheet = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const persist = useCallback(
    async (values: PolicyFormValues) => {
      const payload = {
        ...values,
        leaveTypeId: parseInt(values.leaveTypeId, 10),
      };
      if (editingPolicy) {
        await updateMutation.mutateAsync({ id: editingPolicy.id, ...payload });
        toast.success("Policy updated");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Policy created");
      }
      form.reset(emptyPolicyDefaults);
      onCreated();
    },
    [createMutation, editingPolicy, form, updateMutation, onCreated],
  );

  const { requestLeave, dialogProps } = useUnsavedChangesGuard({
    isDirty: open && isDirty,
    onDiscard: () => {
      form.reset(emptyPolicyDefaults);
    },
    onSave: async () => {
      const valid = await form.trigger();
      if (!valid) throw new Error("Validation failed");
      try {
        await persist(form.getValues());
      } catch (err) {
        toast.error(getErrorMessage(err));
        throw err;
      }
    },
  });

  function handleSheetOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }
    requestLeave(closeSheet);
  }

  async function handleFormSubmit(values: PolicyFormValues) {
    try {
      await persist(values);
      closeSheet();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function handleSeedDefaults() {
    seedLeaveTypes.mutate(undefined, {
      onSuccess: (result) =>
        toast.success(
          result.seeded > 0
            ? `Added ${result.seeded} standard leave types`
            : "Standard leave types already exist",
        ),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleNewTypeNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNewTypeName(e.target.value);
  }

  function handleNewTypeDaysChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNewTypeDays(e.target.value);
  }

  function handleCreateLeaveType() {
    const days = parseInt(newTypeDays, 10);
    if (!newTypeName.trim() || Number.isNaN(days) || days < 0) {
      toast.error("Enter a leave type name and a valid days-per-year value");
      return;
    }
    createLeaveType.mutate(
      { name: newTypeName.trim(), daysPerYear: days },
      {
        onSuccess: (created) => {
          toast.success(`Leave type "${created.name}" created`);
          setNewTypeName("");
          form.setValue("leaveTypeId", String(created.id), {
            shouldValidate: true,
          });
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Sheet open={open} onOpenChange={handleSheetOpenChange}>
        <SheetContent className="w-full sm:max-w-md p-0 flex flex-col gap-0">
          <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
            <SheetTitle>
              {editingPolicy ? "Edit Policy" : "New Leave Policy"}
            </SheetTitle>
          </SheetHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleFormSubmit)}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <SheetBody className="px-6 py-5 space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Policy Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Annual Leave Policy" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="leaveTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Leave Type</FormLabel>
                      {leaveTypeOptions.length === 0 ? (
                        <div className="space-y-2 rounded-lg border border-amber-200/80 bg-amber-50/60 p-3 dark:border-amber-500/25 dark:bg-amber-500/10">
                          <p className="text-xs text-amber-800 dark:text-amber-200">
                            No leave types configured yet. Create your first one
                            here, then attach this policy to it.
                          </p>
                          <LoadingButton
                            type="button"
                            size="sm"
                            variant="outline"
                            className="w-full"
                            isPending={seedLeaveTypes.isPending}
                            onClick={handleSeedDefaults}
                          >
                            Use standard Indian defaults
                          </LoadingButton>
                          <p className="text-center text-micro uppercase tracking-wider text-amber-800/60 dark:text-amber-200/60">
                            or create one
                          </p>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Input
                              value={newTypeName}
                              onChange={handleNewTypeNameChange}
                              placeholder="e.g. Sick Leave"
                              aria-label="Leave type name"
                              className="min-w-0 flex-1"
                            />
                            <Input
                              type="number"
                              value={newTypeDays}
                              onChange={handleNewTypeDaysChange}
                              aria-label="Days per year"
                              className="sm:w-24"
                            />
                            <LoadingButton
                              type="button"
                              size="sm"
                              className="sm:shrink-0"
                              isPending={createLeaveType.isPending}
                              onClick={handleCreateLeaveType}
                            >
                              Add type
                            </LoadingButton>
                          </div>
                        </div>
                      ) : (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select leave type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                            {leaveTypeOptions.map((t) => (
                              <SelectItem key={t.id} value={String(t.id)}>
                                {t.name} · {t.daysPerYear}d/yr
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accrualType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accrual Type</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ANNUAL">Annual</SelectItem>
                          <SelectItem value="MONTHLY">Monthly</SelectItem>
                          <SelectItem value="DAILY">Daily</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="accrualRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Accrual Rate (days)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.5"
                            placeholder="12"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxBalance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Balance</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.5"
                            placeholder="Unlimited"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="carryForwardDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Carry Forward Days</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.5"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="effectiveFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Effective From</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          placeholder="Pick a date"
                          className="text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="encashable"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 rounded-lg border p-3">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div>
                        <FormLabel className="font-medium cursor-pointer">
                          Encashable
                        </FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Allow leave balance encashment
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="probationRestricted"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 rounded-lg border p-3">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div>
                        <FormLabel className="font-medium cursor-pointer">
                          Probation Restricted
                        </FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Restrict during probation period
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </SheetBody>
              <SheetFooter className="shrink-0 px-6 py-4 border-t flex-row gap-2 justify-end">
                <LoadingButton
                  type="submit"
                  isPending={isPending}
                  disabled={leaveTypeOptions.length === 0}
                  loadingText="Saving..."
                  className="w-full"
                >
                  {leaveTypeOptions.length === 0
                    ? "Add a leave type first"
                    : editingPolicy
                      ? "Update Policy"
                      : "Create Policy"}
                </LoadingButton>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
      <UnsavedChangesDialog {...dialogProps} />
    </>
  );
}
