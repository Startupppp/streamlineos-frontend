"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { FileUpload } from "@/components/storage/file-upload";
import {
  helpdeskTicketSchema,
  type HelpdeskTicketFormValues,
} from "@/lib/validations/common-forms";
import type { TicketPriority } from "@/types/hr";

const CATEGORY_OPTIONS = [
  "IT Support",
  "HR Query",
  "Facilities",
  "Finance",
  "Access Request",
  "Equipment",
  "Other",
];

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

interface HelpdeskCreateTicketFormProps {
  onSubmit: (values: HelpdeskTicketFormValues) => void;
  formId?: string;
}

export function HelpdeskCreateTicketForm({
  onSubmit,
  formId = "helpdesk-create-ticket",
}: HelpdeskCreateTicketFormProps) {
  const form = useForm<HelpdeskTicketFormValues>({
    resolver: zodResolver(helpdeskTicketSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      priority: "MEDIUM",
      attachmentUrl: "",
    },
  });

  const handleAttachment = useCallback(
    (url: string) => {
      form.setValue("attachmentUrl", url, { shouldValidate: true });
    },
    [form],
  );

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={form.handleSubmit(onSubmit)}
        className="px-4 py-4 space-y-4"
      >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Brief description of the issue" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Provide more details..." rows={4} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select value={field.value || ""} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormItem>
          <FormLabel>Attachment (optional)</FormLabel>
          <FileUpload
            folder="helpdesk"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onUploadComplete={handleAttachment}
          />
          <FormMessage>{form.formState.errors.attachmentUrl?.message}</FormMessage>
        </FormItem>
      </form>
    </Form>
  );
}
