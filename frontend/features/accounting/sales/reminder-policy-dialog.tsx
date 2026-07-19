"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCreateReminderPolicy,
  useUpdateReminderPolicy,
} from "@/hooks/api/accounting/ar";
import type { ReminderPolicy } from "@/types/accounting/ar";

const policySchema = z.object({
  name: z.string().min(1, "Name is required"),
  offsets: z.string().min(1, "At least one offset is required"),
  channel: z.enum(["EMAIL", "WHATSAPP"]),
  template: z.string().optional(),
});

type PolicyFormValues = z.infer<typeof policySchema>;

interface ReminderPolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy?: ReminderPolicy;
}

function parseOffsets(raw: string): number[] {
  return raw
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));
}

export function ReminderPolicyDialog({
  open,
  onOpenChange,
  policy,
}: ReminderPolicyDialogProps) {
  const isEditing = policy !== undefined;
  const createMutation = useCreateReminderPolicy();
  const updateMutation = useUpdateReminderPolicy();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(policySchema),
    defaultValues: {
      name: "",
      offsets: "",
      channel: "EMAIL",
      template: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: policy?.name ?? "",
        offsets: policy?.offsets?.join(", ") ?? "",
        channel: policy?.channel ?? "EMAIL",
        template: policy?.template ?? "",
      });
    }
  }, [open, policy, form]);

  function handleCancel(): void {
    onOpenChange(false);
  }

  function handleSubmit(values: PolicyFormValues): void {
    const offsets = parseOffsets(values.offsets);
    if (offsets.length === 0) {
      form.setError("offsets", { message: "Enter valid day offsets (e.g. -3, 0, 7)" });
      return;
    }
    const payload = {
      name: values.name,
      offsets,
      channel: values.channel,
      template: values.template || undefined,
    };
    if (isEditing && policy) {
      updateMutation.mutate(
        { policyId: policy.id, ...payload },
        {
          onSuccess: () => { toast.success("Policy updated"); onOpenChange(false); },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => { toast.success("Policy created"); onOpenChange(false); },
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Policy" : "New Reminder Policy"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Standard overdue reminder" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="offsets"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Day offsets <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="-3, 0, 7, 14" {...field} />
                  </FormControl>
                  <FormMessage />
                  <p className="text-[11px] text-muted-foreground">
                    Comma-separated days relative to due date. Negative = before, 0 = due date, positive = after.
                  </p>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="channel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="EMAIL">Email</SelectItem>
                      <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="template"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message template (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Hi {{customer_name}}, your invoice {{invoice_number}} is due…"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <LoadingButton type="submit" isPending={isPending} loadingText="Saving…">
                {isEditing ? "Save changes" : "Create policy"}
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
