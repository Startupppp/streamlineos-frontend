"use client";

import { useCallback, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { rateFormSchema, type RateFormValues } from "./rate-form-schema";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserCombobox } from "@/components/ui/user-combobox";
import { useCreateRate, useUpdateRate } from "@/hooks/api/timesheets-core/rates";
import { useProjects } from "@/hooks/api/build";
import type { TimesheetRate, CreateRateInput } from "@/features/timesheets/rate-types";
import type { BillingType } from "@/features/timesheets/types";
import { BILLING_TYPE_LABEL } from "@/features/timesheets/types";

const BILLING_TYPE_OPTIONS: BillingType[] = ["BILLABLE", "NON_BILLABLE", "FIXED"];

const SELECT_NONE = "__none__";

type RateSubmitInput = CreateRateInput & {
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
};

function toInput(values: RateFormValues, isEdit: boolean): RateSubmitInput {
  const base: RateSubmitInput = {
    billingType: values.billingType,
    billRate: parseFloat(values.billRate),
    costRate: values.costRate ? parseFloat(values.costRate) : undefined,
    currency: values.currency || "USD",
    priority: parseInt(values.priority) || 0,
    projectId:
      values.projectId && values.projectId !== SELECT_NONE
        ? parseInt(values.projectId)
        : undefined,
    userId:
      values.userId && values.userId !== SELECT_NONE ? values.userId : undefined,
  };
  const effectiveFrom = values.effectiveFrom || null;
  const effectiveTo = values.effectiveTo || null;
  if (isEdit) {
    return { ...base, effectiveFrom, effectiveTo };
  }
  if (effectiveFrom) base.effectiveFrom = effectiveFrom;
  if (effectiveTo) base.effectiveTo = effectiveTo;
  return base;
}

interface RateFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rate?: TimesheetRate;
}

export function RateFormSheet({ open, onOpenChange, rate }: RateFormSheetProps) {
  const createRate = useCreateRate();
  const updateRate = useUpdateRate();
  const isPending = createRate.isPending || updateRate.isPending;

  const { data: projectsData } = useProjects();

  const projectList = projectsData?.data ?? [];

  const { control, handleSubmit, reset, register, formState: { errors } } = useForm<RateFormValues>({
    resolver: zodResolver(rateFormSchema),
    defaultValues: {
      projectId: SELECT_NONE,
      userId: SELECT_NONE,
      billingType: "BILLABLE",
      billRate: "",
      costRate: "",
      currency: "INR",
      priority: "0",
      effectiveFrom: "",
      effectiveTo: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    reset(
      rate
        ? {
            projectId: rate.projectId != null ? String(rate.projectId) : SELECT_NONE,
            userId: SELECT_NONE,
            billingType: rate.billingType,
            billRate: rate.billRate,
            costRate: rate.costRate ?? "",
            currency: rate.currency,
            priority: String(rate.priority),
            effectiveFrom: rate.effectiveFrom ?? "",
            effectiveTo: rate.effectiveTo ?? "",
          }
        : {
            projectId: SELECT_NONE,
            userId: SELECT_NONE,
            billingType: "BILLABLE",
            billRate: "",
            costRate: "",
            currency: "INR",
            priority: "0",
            effectiveFrom: "",
            effectiveTo: "",
          },
    );
  }, [open, rate, reset]);

  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  const handleSave = handleSubmit((values) => {
    const input = toInput(values, Boolean(rate));
    if (rate) {
      updateRate.mutate(
        { rateId: rate.id, data: input },
        { onSuccess: handleClose },
      );
    } else {
      createRate.mutate(input, { onSuccess: handleClose });
    }
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 flex flex-col gap-0 overflow-hidden sm:max-w-md">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle className="text-sm font-semibold">
            {rate ? "Edit rate" : "Add rate"}
          </SheetTitle>
        </SheetHeader>

        <form
          onSubmit={handleSave}
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
        >
          <SheetBody className="px-6 py-5 space-y-4">
            <p className="text-dense font-medium text-muted-foreground uppercase tracking-wider">
              Scope (optional)
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Project</Label>
              <Controller
                control={control}
                name="projectId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Any project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SELECT_NONE} className="text-xs text-muted-foreground">
                        Any project
                      </SelectItem>
                      {projectList.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">User</Label>
              <Controller
                control={control}
                name="userId"
                render={({ field }) => (
                  <UserCombobox
                    value={field.value === SELECT_NONE ? "" : field.value}
                    onChange={(next) => field.onChange(next || SELECT_NONE)}
                    placeholder="Any user"
                    allowUnassigned
                    className="h-9 text-sm"
                  />
                )}
              />
            </div>

            <div className="border-t pt-4">
              <p className="text-dense font-medium text-muted-foreground uppercase tracking-wider mb-4">
                Rate details
              </p>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Billing type</Label>
                  <Controller
                    control={control}
                    name="billingType"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BILLING_TYPE_OPTIONS.map((bt) => (
                            <SelectItem key={bt} value={bt} className="text-xs">
                              {BILLING_TYPE_LABEL[bt]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Bill rate *</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      className="h-9 text-sm"
                      {...register("billRate")}
                    />
                    {errors.billRate && <p className="text-xs text-destructive">{errors.billRate.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Cost rate</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      className="h-9 text-sm"
                      {...register("costRate")}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Currency</Label>
                    <Input
                      className="h-9 text-sm"
                      placeholder="USD"
                      {...register("currency")}
                    />
                    {errors.currency && <p className="text-xs text-destructive">{errors.currency.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Priority</Label>
                    <Input
                      type="number"
                      min={0}
                      className="h-9 text-sm"
                      placeholder="0"
                      {...register("priority")}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Effective from</Label>
                    <Input
                      type="date"
                      className="h-9 text-sm"
                      {...register("effectiveFrom")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Effective to</Label>
                    <Input
                      type="date"
                      className="h-9 text-sm"
                      {...register("effectiveTo")}
                    />
                  </div>
                </div>
                {errors.effectiveTo && (
                  <p className="text-xs text-destructive">{errors.effectiveTo.message}</p>
                )}
                <p className="text-dense text-muted-foreground">
                  Leave the effective dates blank to apply this rate always.
                </p>
              </div>
            </div>
          </SheetBody>

          <SheetFooter className="border-t px-6 py-4 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 text-sm"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              size="sm"
              className="h-9 text-sm"
              isPending={isPending}
              loadingText={rate ? "Saving…" : "Adding…"}
            >
              {rate ? "Save changes" : "Add rate"}
            </LoadingButton>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
