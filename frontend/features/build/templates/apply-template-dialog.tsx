"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { applyTemplateSchema, type ApplyTemplateFormValues } from "./templates-schema";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { useApplyProjectTemplate, type ProjectTemplate } from "@/hooks/api/build";
import { formatShortDate } from "@/lib/date-utils";

interface ApplyTemplateDialogProps {
  template: ProjectTemplate;
  onClose: () => void;
}

export function ApplyTemplateDialog({ template, onClose }: ApplyTemplateDialogProps) {
  const router = useRouter();
  const apply = useApplyProjectTemplate();

  const form = useForm<ApplyTemplateFormValues>({
    resolver: zodResolver(applyTemplateSchema),
    defaultValues: {
      name: `${template.name} — ${formatShortDate(new Date())}`,
      description: template.description ?? "",
      startDate: "",
      endDate: "",
    },
  });

  function handleApply(values: ApplyTemplateFormValues) {
    apply.mutate(
      {
        templateId: template.id,
        input: {
          name: values.name.trim(),
          description: values.description.trim() || undefined,
          startDate: values.startDate || undefined,
          endDate: values.endDate || undefined,
        },
      },
      {
        onSuccess: (data) => {
          toast.success(`Project "${values.name}" created with ${data.ticketsCreated} tasks! Key: ${data.key}`);
          onClose();
          router.push(`/build/${data.projectId}`);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Apply &ldquo;{template.name}&rdquo;</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleApply)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage className="text-xs" />
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
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} placeholder="Pick a date" className="text-sm" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} placeholder="Pick a date" className="text-sm" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>
            <div className="rounded-md border p-3 space-y-1 text-sm">
              <p className="font-medium">{(template.tickets ?? []).length} tasks will be created:</p>
              {(template.tickets ?? []).slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-muted-foreground">
                  <Badge variant="outline" className="text-micro">{t.type}</Badge>
                  <span className="truncate">{t.title}</span>
                  {t.phase && (
                    <span className="text-micro bg-muted rounded px-1 shrink-0">{t.phase}</span>
                  )}
                </div>
              ))}
              {(template.tickets ?? []).length > 5 && (
                <p className="text-xs text-muted-foreground">+{(template.tickets ?? []).length - 5} more</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} className="active:scale-[0.98]">
                Cancel
              </Button>
              <LoadingButton type="submit" isPending={apply.isPending} loadingText="Creating…" className="active:scale-[0.98]">
                Create Project
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
