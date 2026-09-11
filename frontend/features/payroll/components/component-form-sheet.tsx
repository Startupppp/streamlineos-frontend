"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { getErrorMessage } from "@/lib/get-error-message";
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

  const form = useForm<ComponentForm>({
    resolver: zodResolver(componentFormSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  const calcMethod = form.watch("calcMethod");

  useEffect(() => {
    form.reset(
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
  }, [component, form]);

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) form.reset(EMPTY_DEFAULTS);
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
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => { toast.success("Component created"); handleOpenChange(false); },
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    }
  }

  const isLoading = create.isPending || update.isPending;
  const isEdit = !!component;

  const toggleFields = [
    { name: "taxable" as const, label: "Taxable", desc: "Include in taxable income" },
    { name: "showOnPayslip" as const, label: "Show on Payslip", desc: "Display on employee payslips" },
    { name: "includeInCtc" as const, label: "Include in CTC", desc: "Count toward Cost to Company" },
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <SheetBody className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">
                        Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input id="comp-name" {...field} className="text-sm" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">
                        Code <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input id="comp-code" {...field} className="text-sm font-mono uppercase" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => {
                    function handleTypeChange(v: string): void {
                      const next = COMPONENT_TYPES.find((t) => t.value === v);
                      if (next) field.onChange(next.value);
                    }
                    return (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          Type <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select value={field.value} onValueChange={handleTypeChange}>
                          <FormControl>
                            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {COMPONENT_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    );
                  }}
                />
                <FormField
                  control={form.control}
                  name="calcMethod"
                  render={({ field }) => {
                    function handleCalcMethodChange(v: string): void {
                      const next = CALC_METHODS.find((m) => m.value === v);
                      if (next) field.onChange(next.value);
                    }
                    return (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          Calc. Method <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select value={field.value} onValueChange={handleCalcMethodChange}>
                          <FormControl>
                            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CALC_METHODS.map((m) => (
                              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    );
                  }}
                />
              </div>

              {calcMethod === "FIXED" && (
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">Fixed Amount</FormLabel>
                      <FormControl>
                        <Input id="comp-amount" {...field} className="text-sm font-mono" placeholder="e.g. 5000" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              )}
              {(calcMethod === "PERCENT_OF_BASIC" || calcMethod === "PERCENT_OF_GROSS") && (
                <FormField
                  control={form.control}
                  name="percent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">Percentage (%)</FormLabel>
                      <FormControl>
                        <Input id="comp-percent" {...field} className="text-sm font-mono" placeholder="e.g. 12" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              )}
              {calcMethod === "FORMULA" && (
                <FormField
                  control={form.control}
                  name="formula"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">Formula</FormLabel>
                      <FormControl>
                        <Input id="comp-formula" {...field} className="text-sm font-mono" placeholder="e.g. basic * 0.12" />
                      </FormControl>
                      <p className="text-micro text-muted-foreground">{FORMULA_HELP}</p>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Sort Order</FormLabel>
                    <FormControl>
                      <Input id="comp-sort" {...field} className="text-sm w-24" placeholder="0" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="space-y-0 pt-1">
                {toggleFields.map(({ name, label, desc }) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                        <div>
                          <p className="text-xs font-medium">{label}</p>
                          <p className="text-micro text-muted-foreground">{desc}</p>
                        </div>
                        <FormControl>
                          <Switch id={name} checked={field.value as boolean} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </SheetBody>

            <SheetFooter className="shrink-0 px-6 py-4 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <LoadingButton type="submit" size="sm" isPending={isLoading} loadingText={isEdit ? "Saving…" : "Creating…"}>
                {isEdit ? "Save Changes" : "Add Component"}
              </LoadingButton>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
