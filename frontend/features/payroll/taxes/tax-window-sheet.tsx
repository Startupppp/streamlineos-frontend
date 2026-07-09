"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { useCreateTaxWindow, useUpdateTaxWindow } from "@/hooks/api/payroll/tax-windows";
import type { TaxWindow } from "@/types/payroll/reports";

const schema = z.object({
  financialYear: z.string().min(1, "Required"),
  opensAt: z.string().min(1, "Required"),
  closesAt: z.string().min(1, "Required"),
  proofDeadline: z.string().optional(),
  lockDate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

interface TaxWindowSheetProps {
  window?: TaxWindow;
  onClose: () => void;
}

export function TaxWindowSheet({ window, onClose }: TaxWindowSheetProps) {
  const createMutation = useCreateTaxWindow();
  const updateMutation = useUpdateTaxWindow();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      financialYear: window?.financialYear ?? "",
      opensAt: toDateInputValue(window?.opensAt ?? null),
      closesAt: toDateInputValue(window?.closesAt ?? null),
      proofDeadline: toDateInputValue(window?.proofDeadline ?? null),
      lockDate: toDateInputValue(window?.lockDate ?? null),
    },
  });

  function handleSubmit(values: FormValues) {
    const payload = {
      financialYear: values.financialYear,
      opensAt: values.opensAt,
      closesAt: values.closesAt,
      proofDeadline: values.proofDeadline || undefined,
      lockDate: values.lockDate || undefined,
    };

    if (window) {
      updateMutation.mutate(
        { id: window.id, ...payload },
        {
          onSuccess: () => {
            toast.success("Declaration window updated");
            onClose();
          },
          onError: () => toast.error("Failed to update window"),
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Declaration window created");
          onClose();
        },
        onError: () => toast.error("Failed to create window"),
      });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="flex flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>{window ? "Edit Window" : "New Declaration Window"}</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <FormField
                control={form.control}
                name="financialYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Financial Year</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 2024-25" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="opensAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opens At</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="h-8 text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="closesAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Closes At</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="h-8 text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="proofDeadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proof Deadline (optional)</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="h-8 text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lockDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lock Date (optional)</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="h-8 text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t px-6 py-4 grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
