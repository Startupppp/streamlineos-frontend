"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { LoadingButton } from "@/components/ui/loading-button";
import type { Pricebook } from "@/types/crm/pricebooks";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  currency: z.string().min(1).default("INR"),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type PricebookFormValues = z.infer<typeof schema>;

export const defaultPricebookValues: PricebookFormValues = {
  name: "",
  description: "",
  currency: "INR",
  isDefault: false,
  isActive: true,
};

export function pricebookValuesFromPricebook(pb: Pricebook): PricebookFormValues {
  return {
    name: pb.name,
    description: pb.description ?? "",
    currency: pb.currency,
    isDefault: pb.isDefault,
    isActive: pb.isActive,
  };
}

interface PricebookFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTarget: Pricebook | null;
  onSubmit: (values: PricebookFormValues) => void;
  isPending: boolean;
  initialValues: PricebookFormValues;
}

export function PricebookFormSheet({
  open,
  onOpenChange,
  editTarget,
  onSubmit,
  isPending,
  initialValues,
}: PricebookFormSheetProps) {
  const form = useForm<PricebookFormValues>({
    resolver: zodResolver(schema),
    values: initialValues,
  });

  function handleSubmit(data: PricebookFormValues) {
    onSubmit(data);
  }

  function handleCancel() {
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 flex flex-col overflow-hidden sm:max-w-lg">
        <SheetHeader className="shrink-0 px-6 py-4 border-b">
          <SheetTitle>{editTarget ? "Edit Pricebook" : "Add Pricebook"}</SheetTitle>
          <SheetDescription>
            {editTarget
              ? "Update the pricebook details below."
              : "Create a new pricebook for product pricing tiers."}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Standard Pricing" />
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
                      <Textarea
                        {...field}
                        placeholder="Optional description"
                        rows={2}
                        className="resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. INR, USD" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <FormLabel className="font-normal">Set as default pricebook</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <FormLabel className="font-normal">Active</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
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
