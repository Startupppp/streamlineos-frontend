"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail } from "lucide-react";
import { EntityFormDialog } from "@/components/shared";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCompleteTask, type TaskWithBucket } from "@/lib/api/hooks/tasks";
import { useLeadDetail } from "@/lib/api/hooks/leads";
import { toast } from "sonner";

const emailTaskSchema = z.object({
  to: z.string().email("Enter a valid email address"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().optional(),
});

type EmailTaskValues = z.infer<typeof emailTaskSchema>;

interface EmailTaskDialogProps {
  task: TaskWithBucket;
  onClose: () => void;
}

export function EmailTaskDialog({ task, onClose }: EmailTaskDialogProps) {
  const isLeadTask = task.entityType === "LEAD" && !!task.entityId;
  const { data: lead } = useLeadDetail(isLeadTask ? task.entityId! : 0);
  const completeTask = useCompleteTask();

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  const handleSubmit = (data: EmailTaskValues) => {
    window.open(
      `mailto:${encodeURIComponent(data.to)}?subject=${encodeURIComponent(
        data.subject,
      )}&body=${encodeURIComponent(data.body ?? "")}`,
      "_blank",
    );
    completeTask.mutate(
      { taskId: task.id },
      {
        onSuccess: () => {
          toast.success("Email opened and task marked complete");
          onClose();
        },
        onError: () => toast.error("Failed to complete task"),
      },
    );
  };

  return (
    <EntityFormDialog<EmailTaskValues>
      open
      onOpenChange={handleOpenChange}
      title="Send email"
      description={
        lead
          ? `Lead: ${lead.name}${lead.company ? ` · ${lead.company}` : ""}`
          : undefined
      }
      resolver={zodResolver(emailTaskSchema)}
      defaultValues={{
        to: lead?.email ?? "",
        subject: `Follow-up: ${task.title}`,
        body: "",
      }}
      onSubmit={handleSubmit}
      isSubmitting={completeTask.isPending}
      submitLabel="Send & complete"
      className="max-w-lg"
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="to"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-amber-500" />
                  To
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="recipient@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="subject"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subject</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="body"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Body</FormLabel>
                <FormControl>
                  <Textarea
                    rows={6}
                    placeholder="Write your email here..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <p className="text-xs text-muted-foreground">
            Clicking Send opens your default mail client and marks this task complete.
          </p>
        </>
      )}
    </EntityFormDialog>
  );
}
