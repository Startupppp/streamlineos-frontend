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
  isDefault: z.boolean().default(false),
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
      <SheetContent className="p-0 flex flex-col gap-0 sm:max-w-lg">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>{editTarget ? "Edit Template" : "Add Template"}</SheetTitle>
          <SheetDescription>
            {editTarget
              ? "Update this quote document template."
              : "Create a reusable quote document template."}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Standard Quote Template" />
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
            </div>
            <div className="border-t shrink-0 grid grid-cols-2 px-6 py-4 gap-3">
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
