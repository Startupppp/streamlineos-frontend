"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCreatePayrollAdjustment } from "@/hooks/api/payroll/payroll-inputs";

const schema = z.object({
  userId: z.string().min(1, "Required"),
  adjustmentType: z.enum(["arrears", "recovery", "correction"] as const),
  section: z.enum([
    "employee_master",
    "compensation",
    "attendance",
    "leave",
    "overtime",
    "reimbursement",
    "deduction",
    "lifecycle",
  ] as const),
  amountCents: z.string().optional(),
  days: z.string().optional(),
  reason: z.string().min(1, "Required").max(1000),
});

type FormValues = z.infer<typeof schema>;

interface CreateAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periodId: number;
}

export function CreateAdjustmentDialog({ open, onOpenChange, periodId }: CreateAdjustmentDialogProps) {
  const create = useCreatePayrollAdjustment();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      adjustmentType: "correction",
      section: "attendance",
      reason: "",
      userId: "",
      amountCents: "",
      days: "",
    },
  });

  function handleSubmit(values: FormValues) {
    create.mutate(
      {
        periodId,
        userId: values.userId,
        adjustmentType: values.adjustmentType,
        section: values.section,
        amountCents: values.amountCents ? Number(values.amountCents) : undefined,
        days: values.days ? Number(values.days) : undefined,
        reason: values.reason,
      },
      {
        onSuccess: () => {
          form.reset();
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Adjustment</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee User ID</FormLabel>
                  <FormControl>
                    <Input placeholder="user_..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="adjustmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="arrears">Arrears</SelectItem>
                        <SelectItem value="recovery">Recovery</SelectItem>
                        <SelectItem value="correction">Correction</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="section"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="attendance">Attendance</SelectItem>
                        <SelectItem value="leave">Leave</SelectItem>
                        <SelectItem value="overtime">Overtime</SelectItem>
                        <SelectItem value="reimbursement">Reimbursement</SelectItem>
                        <SelectItem value="deduction">Deduction</SelectItem>
                        <SelectItem value="compensation">Compensation</SelectItem>
                        <SelectItem value="lifecycle">Lifecycle</SelectItem>
                        <SelectItem value="employee_master">Employee Master</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="amountCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (cents)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Days</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.5" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Describe the reason..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <LoadingButton type="submit" isPending={create.isPending}>
                Create Adjustment
              </LoadingButton>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
