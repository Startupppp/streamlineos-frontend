"use client";

import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCreateUom } from "@/hooks/api/inventory";
import { getErrorMessage } from "@/lib/get-error-message";
import { uomSchema, type UomFormValues } from "@/features/inventory/lib/uom-schema";

interface UomCreateFormProps {
  onSuccess: () => void;
}

export function UomCreateForm({ onSuccess }: UomCreateFormProps) {
  const createMutation = useCreateUom();

  const form = useForm<UomFormValues>({
    resolver: zodResolver(uomSchema),
    defaultValues: {
      name: "",
      abbreviation: "",
      category: "",
      isBase: false,
      ratioToBase: "",
      roundingPrecision: "2",
    },
  });

  const isBase = form.watch("isBase");

  async function onSubmit(values: UomFormValues): Promise<void> {
    const trimmedName = values.name.trim();
    const trimmedAbbr = values.abbreviation.trim();
    try {
      await createMutation.mutateAsync({
        name: trimmedName,
        abbreviation: trimmedAbbr,
        category: values.category?.trim() || undefined,
        isBase: values.isBase,
        ratioToBase: values.ratioToBase || undefined,
        roundingPrecision: Number(values.roundingPrecision),
      });
      toast.success(`Unit "${trimmedName}" created`);
      form.reset();
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Kilogram" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="abbreviation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Abbreviation</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. kg"
                    className="font-mono uppercase"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Weight, Volume, Length" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="roundingPrecision"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rounding Precision</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="6"
                    step="1"
                    placeholder="2"
                    className="tabular-nums"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isBase"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-md border p-3">
                <FormLabel className="cursor-pointer">Base Unit</FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          {!isBase && (
            <FormField
              control={form.control}
              name="ratioToBase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ratio to Base</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 1000"
                      className="tabular-nums"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Ratio to base unit: {field.value || "—"}:1
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {isBase && (
            <p className="text-[10px] text-muted-foreground self-center">
              This UOM is the base unit for its category.
            </p>
          )}
        </div>
        <div className="flex justify-end">
          <LoadingButton
            type="submit"
            size="sm"
            isPending={createMutation.isPending}
            loadingText="Creating…"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add UOM
          </LoadingButton>
        </div>
      </form>
    </Form>
  );
}
