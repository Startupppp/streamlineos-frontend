"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
} from "@/components/ui/sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import type { QuoteTemplate } from "@/types/crm/pricebooks";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  isDefault: z.boolean(),
  terms: z.string().optional(),
});

export type QuoteTemplateFormValues = z.infer<typeof schema>;

export const defaultTemplateValues: QuoteTemplateFormValues = {
  name: "",
  isDefault: false,
  terms: "",
};

export function templateValuesFromTemplate(t: QuoteTemplate): QuoteTemplateFormValues {
  return {
    name: t.name,
    isDefault: t.isDefault,
    terms: t.terms ?? "",
  };
}

interface QuoteTemplateFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTarget: QuoteTemplate | null;
  onSubmit: (values: QuoteTemplateFormValues) => void;
  isPending: boolean;
  initialValues: QuoteTemplateFormValues;
}

export function QuoteTemplateFormSheet({
  open,
  onOpenChange,
  editTarget,
  onSubmit,
  isPending,
  initialValues,
}: QuoteTemplateFormSheetProps) {
  const form = useForm<QuoteTemplateFormValues>({
    resolver: zodResolver(schema),
    values: initialValues,
  });

  function handleSubmit(values: QuoteTemplateFormValues) {
    onSubmit(values);
  }

  function handleCancel() {
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4">
          <SheetTitle>{editTarget ? "Edit Template" : "Add Template"}</SheetTitle>
          <SheetDescription>
            {editTarget
              ? "Update this quote document template."
              : "Create a reusable quote document template."}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex min-h-0 flex-1 flex-col">
            <SheetBody className="space-y-4 px-6 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Standard Quote Template" className="h-8" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <FormLabel className="cursor-pointer">Set as default template</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Terms &amp; Conditions</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Enter the terms and conditions for this template..."
                        rows={5}
                        className="resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </SheetBody>
            <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-border bg-muted/30 px-6 py-4">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <LoadingButton type="submit" isPending={isPending} loadingText="Saving...">
                Save
              </LoadingButton>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
