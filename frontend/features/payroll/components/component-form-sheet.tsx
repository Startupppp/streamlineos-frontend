"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCreatePayrollComponent, useUpdatePayrollComponent } from "@/hooks/api/payroll";
import type { SalaryComponent, ComponentType, CalcMethod } from "@/types/payroll/setup";
import {
  componentFormSchema,
  type ComponentForm,
  COMPONENT_TYPES,
  CALC_METHODS,
  FORMULA_HELP,
} from "./lib/component-form-schema";

type ComponentFormSheetProps = {
  component?: SalaryComponent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const EMPTY_DEFAULTS: ComponentForm = {
  name: "", code: "", type: "EARNING", calcMethod: "FIXED",
  taxable: true, showOnPayslip: true, includeInCtc: true,
  amount: "", percent: "", formula: "", sortOrder: "",
};

export function ComponentFormSheet({ component, open, onOpenChange }: ComponentFormSheetProps) {
  const create = useCreatePayrollComponent();
  const update = useUpdatePayrollComponent();

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<ComponentForm>({
    resolver: zodResolver(componentFormSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  useEffect(() => {
    reset(
      component
        ? {
            name: component.name,
            code: component.code,
            type: component.type,
            calcMethod: component.calcMethod,
            taxable: component.taxable,
            showOnPayslip: component.showOnPayslip,
            includeInCtc: component.includeInCtc,
            amount: component.amount ?? "",
            percent: component.percent ?? "",
            formula: component.formula ?? "",
            sortOrder: String(component.sortOrder),
          }
        : EMPTY_DEFAULTS,
    );
  }, [component, reset]);

  const calcMethod = watch("calcMethod");

  function handleTypeChange(v: string) { setValue("type", v as ComponentType); }
  function handleCalcMethodChange(v: string) { setValue("calcMethod", v as CalcMethod); }
  function handleTaxableChange(checked: boolean) { setValue("taxable", checked); }
  function handlePayslipChange(checked: boolean) { setValue("showOnPayslip", checked); }
  function handleCtcChange(checked: boolean) { setValue("includeInCtc", checked); }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) reset(EMPTY_DEFAULTS);
    onOpenChange(isOpen);
  }

  function onSubmit(data: ComponentForm) {
    const payload = {
      name: data.name,
      code: data.code.toUpperCase(),
      type: data.type,
      calcMethod: data.calcMethod,
      taxable: data.taxable,
      showOnPayslip: data.showOnPayslip,
      includeInCtc: data.includeInCtc,
      amount: data.amount || undefined,
      percent: data.percent || undefined,
      formula: data.formula || undefined,
      sortOrder: data.sortOrder ? parseInt(data.sortOrder, 10) : undefined,
    };

    if (component) {
      update.mutate(
        { id: component.id, data: payload },
        {
          onSuccess: () => { toast.success("Component updated"); handleOpenChange(false); },
          onError: () => toast.error("Failed to update component"),
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => { toast.success("Component created"); handleOpenChange(false); },
        onError: () => toast.error("Failed to create component"),
      });
    }
  }

  const isLoading = create.isPending || update.isPending;
  const isEdit = !!component;

  const toggleRows = [
    { id: "taxable", label: "Taxable", desc: "Include in taxable income", value: watch("taxable"), onChange: handleTaxableChange },
    { id: "payslip", label: "Show on Payslip", desc: "Display on employee payslips", value: watch("showOnPayslip"), onChange: handlePayslipChange },
    { id: "ctc", label: "Include in CTC", desc: "Count toward Cost to Company", value: watch("includeInCtc"), onChange: handleCtcChange },
  ];

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="p-0 flex flex-col gap-0 overflow-hidden sm:max-w-lg">
        <div className="shrink-0 px-6 py-4 border-b">
          <SheetHeader>
            <SheetTitle className="text-base">{isEdit ? "Edit Component" : "Add Component"}</SheetTitle>
            <SheetDescription className="text-xs">
              {isEdit ? "Update this salary component" : "Define a new salary component"}
            </SheetDescription>
          </SheetHeader>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <SheetBody className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="comp-name" className="text-xs font-medium">Name *</Label>
                <Input id="comp-name" {...register("name")} className="h-8 text-sm" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="comp-code" className="text-xs font-medium">Code *</Label>
                <Input id="comp-code" {...register("code")} className="h-8 text-sm font-mono uppercase" />
                {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Type *</Label>
                <Select value={watch("type")} onValueChange={handleTypeChange}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COMPONENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Calc. Method *</Label>
                <Select value={watch("calcMethod")} onValueChange={handleCalcMethodChange}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CALC_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {calcMethod === "FIXED" && (
              <div className="space-y-1">
                <Label htmlFor="comp-amount" className="text-xs font-medium">Fixed Amount</Label>
                <Input id="comp-amount" {...register("amount")} className="h-8 text-sm font-mono" placeholder="e.g. 5000" />
              </div>
            )}
            {(calcMethod === "PERCENT_OF_BASIC" || calcMethod === "PERCENT_OF_GROSS") && (
              <div className="space-y-1">
                <Label htmlFor="comp-percent" className="text-xs font-medium">Percentage (%)</Label>
                <Input id="comp-percent" {...register("percent")} className="h-8 text-sm font-mono" placeholder="e.g. 12" />
              </div>
            )}
            {calcMethod === "FORMULA" && (
              <div className="space-y-1">
                <Label htmlFor="comp-formula" className="text-xs font-medium">Formula</Label>
                <Input id="comp-formula" {...register("formula")} className="h-8 text-sm font-mono" placeholder="e.g. basic * 0.12" />
                <p className="text-[10px] text-muted-foreground">{FORMULA_HELP}</p>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="comp-sort" className="text-xs font-medium">Sort Order</Label>
              <Input id="comp-sort" {...register("sortOrder")} className="h-8 text-sm w-24" placeholder="0" />
            </div>

            <div className="space-y-0 pt-1">
              {toggleRows.map(({ id, label, desc, value, onChange }) => (
                <div key={id} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-xs font-medium">{label}</p>
                    <p className="text-[10px] text-muted-foreground">{desc}</p>
                  </div>
                  <Switch id={id} checked={value} onCheckedChange={onChange} />
                </div>
              ))}
            </div>
          </SheetBody>

          <SheetFooter className="shrink-0 px-6 py-4 border-t">
            <Button type="button" variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isLoading}>
              {isLoading ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save Changes" : "Add Component")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
