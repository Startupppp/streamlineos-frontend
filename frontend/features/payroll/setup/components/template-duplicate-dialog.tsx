"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Button } from "@/components/ui/button";
import { useDuplicateTemplate } from "@/hooks/api/payroll";
import { toast } from "sonner";
import type { TemplateRow } from "@/types/payroll/setup";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  description: z.string().optional(),
});

type DuplicateForm = z.infer<typeof schema>;

type TemplateDuplicateDialogProps = {
  template: TemplateRow | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newTemplate: TemplateRow) => void;
};

export function TemplateDuplicateDialog({
  template,
  onOpenChange,
  onSuccess,
}: TemplateDuplicateDialogProps) {
  const open = template !== null;
  const duplicate = useDuplicateTemplate();

  const form = useForm<DuplicateForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: template ? `${template.name} (copy)` : "", description: "" },
  });

  function handleOpenChange(next: boolean) {
    if (!next) {
      form.reset();
      onOpenChange(false);
    }
  }

  function handleSubmit(data: DuplicateForm) {
    if (!template) return;
    duplicate.mutate(
      { templateId: template.id, name: data.name, description: data.description },
      {
        onSuccess: (result) => {
          toast.success("Template duplicated");
          form.reset();
          onSuccess(result);
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to duplicate template"),
      },
    );
  }

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Duplicate Template</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Template name" />
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
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Short description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={duplicate.isPending}>
                {duplicate.isPending ? "Duplicating…" : "Duplicate"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
