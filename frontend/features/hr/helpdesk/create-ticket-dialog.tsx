"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCreateHelpdeskTicket,
  useHelpdeskSuggest,
  HELPDESK_CATEGORIES,
  HELPDESK_CATEGORY_LABELS,
  type HelpdeskCategory,
} from "@/hooks/api/hr/helpdesk";

const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(150),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000).optional(),
  category: z.enum(HELPDESK_CATEGORIES),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  isConfidential: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateTicketDialog({ open, onClose }: Props) {
  const [titleQuery, setTitleQuery] = useState("");
  const { data: suggestions } = useHelpdeskSuggest(titleQuery);
  const createTicket = useCreateHelpdeskTicket();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "other",
      isConfidential: false,
    },
  });

  const handleTitleChange = useCallback((value: string) => {
    setTitleQuery(value.length >= 3 ? value : "");
  }, []);

  const onSubmit = async (values: FormValues) => {
    try {
      await createTicket.mutateAsync({
        title: values.title,
        description: values.description || undefined,
        category: values.category as HelpdeskCategory,
        priority: values.priority,
        isConfidential: values.isConfidential,
      });
      toast.success("Ticket submitted successfully.");
      form.reset();
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleClose = () => {
    form.reset();
    setTitleQuery("");
    onClose();
  };

  const showSuggestions =
    titleQuery.length >= 3 && suggestions && suggestions.results.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit HR Request</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Brief summary of your request"
                      onChange={(e) => {
                        field.onChange(e);
                        handleTitleChange(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showSuggestions && (
              <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Suggested articles that may help:</p>
                <ul className="space-y-1">
                  {suggestions.results.map((r) => (
                    <li key={`${r.source}-${r.id}`} className="text-xs text-blue-600 hover:underline cursor-default">
                      {r.title}
                      {r.excerpt && (
                        <span className="text-muted-foreground ml-1 not-italic">— {r.excerpt.slice(0, 60)}…</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {HELPDESK_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {HELPDESK_CATEGORY_LABELS[cat]}
                          </SelectItem>
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
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Medium" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder="Describe your issue or request in detail…"
                      className="resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isConfidential"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="min-w-0">
                    <FormLabel className="text-sm font-medium cursor-pointer">Mark as Confidential</FormLabel>
                    <p className="text-xs text-muted-foreground">Only HR managers can view confidential tickets.</p>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <LoadingButton
                type="button"
                variant="outline"
                onClick={handleClose}
                isPending={false}
              >
                Cancel
              </LoadingButton>
              <LoadingButton type="submit" isPending={createTicket.isPending} loadingText="Submitting…">
                Submit Request
              </LoadingButton>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
