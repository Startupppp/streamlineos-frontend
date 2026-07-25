"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Pencil, Clock, Calendar } from "lucide-react";
import { Trash2Icon, PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetBody } from "@/components/ui/sheet";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState as UiEmptyState } from "@/components/ui/empty-state";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import { useUnsavedChangesGuard } from "@/hooks/common/use-unsaved-changes-guard";
import { useCan } from "@/hooks/api/access";
import {
  useLeavePolicies,
  useCreateLeavePolicy,
  useUpdateLeavePolicy,
  useDeleteLeavePolicy,
  type LeavePolicy,
} from "@/hooks/api/hr/leave-policies";
import { useCreateLeaveType, useLeaveTypesAdmin, useSeedLeaveTypes } from "@/hooks/api/hr/leaves";
import { LeaveTypesManager } from "@/features/hr/leaves/leave-types-manager";

const policySchema = z.object({
  name: z.string().min(1, "Name is required"),
  leaveTypeId: z.string().min(1, "Leave type is required"),
  accrualType: z.enum(["ANNUAL", "MONTHLY", "DAILY"]),
  accrualRate: z.string().min(1, "Accrual rate is required"),
  maxBalance: z.string().optional(),
  carryForwardDays: z.string(),
  encashable: z.boolean(),
  probationRestricted: z.boolean(),
  effectiveFrom: z.string().min(1, "Effective date is required"),
});

type PolicyFormValues = z.infer<typeof policySchema>;

const ACCRUAL_LABELS: Record<string, string> = {
  ANNUAL: "days/year",
  MONTHLY: "days/month",
  DAILY: "days/day",
};

function PolicyCard({
  policy,
  index,
  canManage,
  leaveTypeName,
  onEdit,
  onDelete,
}: {
  policy: LeavePolicy;
  index: number;
  canManage: boolean;
  leaveTypeName?: string;
  onEdit: (policy: LeavePolicy) => void;
  onDelete: (id: number) => void;
}) {
  function handleEditClick() {
    onEdit(policy);
  }
  function handleDeleteClick() {
    onDelete(policy.id);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut", delay: index * 0.08 }}
      className="bg-card border border-border rounded-lg shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow duration-200"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-foreground">{policy.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{leaveTypeName ?? "Unknown leave type"}</p>
        </div>
        {canManage && (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="w-7" aria-label={`Edit ${policy.name}`} onClick={handleEditClick}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <AnimatedIconButton
              icon={Trash2Icon}
              variant="ghost"
              size="icon"
              className="w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
              iconSize={14}
              aria-label={`Delete ${policy.name}`}
              onClick={handleDeleteClick}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm text-foreground">
        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
        <span>
          {policy.accrualRate} {ACCRUAL_LABELS[policy.accrualType] ?? "days"}
        </span>
      </div>

      {Number(policy.carryForwardDays) > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <span>Carry forward: {policy.carryForwardDays} days</span>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mt-1">
        {policy.encashable && (
          <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30">
            Encashable
          </Badge>
        )}
        {policy.probationRestricted && (
          <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30">
            Probation Restricted
          </Badge>
        )}
        <Badge variant="outline" className="text-xs">
          {policy.accrualType}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground mt-auto pt-2 border-t border-border">
        Effective from {policy.effectiveFrom}
      </p>
    </motion.div>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="flex-1 flex flex-col"
    >
      <UiEmptyState
        illustrationPreset="calendar"
        title="No leave policies yet"
        description="Define accrual rules and carry-forward policies for each leave type."
        action={{ label: "Create Policy", onClick: onCreateClick }}
      />
    </motion.div>
  );
}

export default function LeavePoliciesPage() {
  const { data: policies, isLoading } = useLeavePolicies();
  const { data: leaveTypesData } = useLeaveTypesAdmin();
  const leaveTypeOptions = leaveTypesData ?? [];
  const createMutation = useCreateLeavePolicy();
  const createLeaveType = useCreateLeaveType();
  const seedLeaveTypes = useSeedLeaveTypes();

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
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeDays, setNewTypeDays] = useState("12");

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
          form.setValue("leaveTypeId", String(created.id), { shouldValidate: true });
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }
  const updateMutation = useUpdateLeavePolicy();
  const deleteMutation = useDeleteLeavePolicy();
  const canManage = useCan("hr:leaves:manage");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<LeavePolicy | null>(null);

  const emptyDefaults = useMemo<PolicyFormValues>(
    () => ({
      accrualType: "ANNUAL",
      carryForwardDays: "0",
      encashable: false,
      probationRestricted: false,
      name: "",
      leaveTypeId: "",
      accrualRate: "",
      maxBalance: "",
      effectiveFrom: "",
    }),
    [],
  );

  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(policySchema),
    defaultValues: emptyDefaults,
  });

  const isDirty = form.formState.isDirty;

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setEditingPolicy(null);
  }, []);

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
      form.reset(emptyDefaults);
    },
    [createMutation, editingPolicy, emptyDefaults, form, updateMutation],
  );

  const { requestLeave, dialogProps } = useUnsavedChangesGuard({
    isDirty: sheetOpen && isDirty,
    onDiscard: () => {
      form.reset(emptyDefaults);
      setEditingPolicy(null);
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

  function handleCreateClick() {
    setEditingPolicy(null);
    form.reset(emptyDefaults);
    setSheetOpen(true);
  }

  function handleEditClick(policy: LeavePolicy) {
    setEditingPolicy(policy);
    form.reset({
      name: policy.name,
      leaveTypeId: String(policy.leaveTypeId),
      accrualType: policy.accrualType as "ANNUAL" | "MONTHLY" | "DAILY",
      accrualRate: policy.accrualRate,
      maxBalance: policy.maxBalance ?? "",
      carryForwardDays: policy.carryForwardDays,
      encashable: policy.encashable,
      probationRestricted: policy.probationRestricted,
      effectiveFrom: policy.effectiveFrom,
    });
    setSheetOpen(true);
  }

  function handleDeleteClick(id: number) {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success("Policy deleted"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleSheetOpenChange(open: boolean) {
    if (open) {
      setSheetOpen(true);
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

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <PageWrapper
      title="Leave Policies"
      subtitle="Define accrual and carry-forward rules per leave type"
      actions={
        canManage ? (
          <AnimatedIconButton icon={PlusIcon} size="sm" iconSize={16} onClick={handleCreateClick}>
            {" New Policy"}
          </AnimatedIconButton>
        ) : undefined
      }
    >
      <div className="mb-4">
        <LeaveTypesManager canManage={canManage} />
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-lg" />
          ))}
        </div>
      ) : !policies?.length ? (
        <EmptyState onCreateClick={handleCreateClick} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {policies.map((policy, i) => (
            <PolicyCard
              key={policy.id}
              policy={policy}
              index={i}
              canManage={canManage}
              leaveTypeName={leaveTypeOptions.find((t) => t.id === policy.leaveTypeId)?.name}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent className="w-full sm:max-w-md p-0 flex flex-col gap-0">
          <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
            <SheetTitle>{editingPolicy ? "Edit Policy" : "New Leave Policy"}</SheetTitle>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex-1 flex flex-col overflow-hidden">
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
                          No leave types configured yet. Create your first one here, then
                          attach this policy to it.
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
                        <p className="text-center text-[10px] uppercase tracking-wider text-amber-800/60 dark:text-amber-200/60">
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
                      <Select value={field.value} onValueChange={field.onChange}>
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
                    <Select value={field.value} onValueChange={field.onChange}>
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
                        <Input type="number" step="0.5" placeholder="12" {...field} />
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
                        <Input type="number" step="0.5" placeholder="Unlimited" {...field} />
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
                      <Input type="number" step="0.5" placeholder="0" {...field} />
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
                      <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="text-sm" />
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
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div>
                      <FormLabel className="font-medium cursor-pointer">Encashable</FormLabel>
                      <p className="text-xs text-muted-foreground">Allow leave balance encashment</p>
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
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div>
                      <FormLabel className="font-medium cursor-pointer">Probation Restricted</FormLabel>
                      <p className="text-xs text-muted-foreground">Restrict during probation period</p>
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
    </PageWrapper>
  );
}
