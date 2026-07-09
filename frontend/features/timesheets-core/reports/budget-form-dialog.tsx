"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjects } from "@/hooks/api/projects";
import { useCreateBudget, useUpdateBudget } from "@/hooks/api/timesheets-core/budgets";
import type { TimesheetBudget } from "@/features/timesheets-core/types";

const schema = z.object({
  projectId: z.string().min(1, "Select a project"),
  budgetType: z.enum(["HOURS", "AMOUNT"]),
  budgetValue: z.string().min(1, "Enter a budget amount"),
  currency: z.string().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface BudgetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget?: TimesheetBudget | null;
}

export function BudgetFormDialog({ open, onOpenChange, budget }: BudgetFormDialogProps) {
  const { data: projectsData } = useProjects();
  const projectList = projectsData?.data ?? [];
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const isEdit = !!budget;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      projectId: "",
      budgetType: "HOURS",
      budgetValue: "",
      currency: "USD",
      startsAt: "",
      endsAt: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        projectId: budget?.projectId ? String(budget.projectId) : "",
        budgetType: budget?.budgetType ?? "HOURS",
        budgetValue:
          budget?.budgetType === "AMOUNT"
            ? (budget?.budgetAmount ?? "")
            : (budget?.budgetHours ?? ""),
        currency: budget?.currency ?? "USD",
        startsAt: budget?.startsAt ?? "",
        endsAt: budget?.endsAt ?? "",
      });
    }
  }, [open, budget, form]);

  const budgetType = form.watch("budgetType");
  const isPending = createBudget.isPending || updateBudget.isPending;

  const handleSubmit = form.handleSubmit((values) => {
    const value = Number(values.budgetValue);
    const payload = {
      projectId: Number(values.projectId),
      budgetType: values.budgetType,
      budgetHours: values.budgetType === "HOURS" ? value : undefined,
      budgetAmount: values.budgetType === "AMOUNT" ? value : undefined,
      currency: values.budgetType === "AMOUNT" ? values.currency || "USD" : undefined,
      startsAt: values.startsAt || undefined,
      endsAt: values.endsAt || undefined,
    };
    const onDone = () => onOpenChange(false);
    if (isEdit && budget) {
      updateBudget.mutate({ budgetId: budget.id, data: payload }, { onSuccess: onDone });
    } else {
      createBudget.mutate(payload, { onSuccess: onDone });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit budget" : "New project budget"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[13px]">Project</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projectList.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="budgetType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[13px]">Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="HOURS">Hours</SelectItem>
                        <SelectItem value="AMOUNT">Amount</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="budgetValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[13px]">
                      {budgetType === "AMOUNT" ? "Amount" : "Hours"}
                    </FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" className="h-9" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {budgetType === "AMOUNT" && (
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[13px]">Currency</FormLabel>
                    <FormControl>
                      <Input className="h-9" maxLength={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="startsAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[13px]">Starts (optional)</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="h-9" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endsAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[13px]">Ends (optional)</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="h-9" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {isEdit ? "Save" : "Create budget"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
