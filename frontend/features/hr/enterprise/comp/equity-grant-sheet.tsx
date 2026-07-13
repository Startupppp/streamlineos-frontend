"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateEquityGrant } from "@/hooks/api/hr/enterprise-comp";

const schema = z.object({
  userId: z.string().min(1, "Required"),
  grantType: z.enum(["ISO", "NSO", "RSU", "other"]),
  units: z.number().int().positive(),
  strikePriceCents: z.number().int().min(0).optional(),
  grantDate: z.string().min(1, "Required"),
  cliffMonths: z.number().int().min(0),
  vestingMonths: z.number().int().positive(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function EquityGrantSheet({ open, onOpenChange }: Props) {
  const createMut = useCreateEquityGrant();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { grantType: "RSU", cliffMonths: 12, vestingMonths: 48 },
  });

  function onSubmit(values: FormValues) {
    createMut.mutate(
      { ...values, units: Number(values.units), cliffMonths: Number(values.cliffMonths), vestingMonths: Number(values.vestingMonths) },
      {
        onSuccess: () => { toast.success("Equity grant created with vesting schedule"); onOpenChange(false); form.reset(); },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>New Equity Grant</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <FormField control={form.control} name="userId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee ID</FormLabel>
                  <FormControl><Input placeholder="User ID" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="grantType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Grant Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="ISO">ISO</SelectItem>
                      <SelectItem value="NSO">NSO</SelectItem>
                      <SelectItem value="RSU">RSU</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="units" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Units</FormLabel>
                    <FormControl><Input type="number" min={1} {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="strikePriceCents" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Strike Price (cents)</FormLabel>
                    <FormControl><Input type="number" min={0} placeholder="Optional" {...field} onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="grantDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Grant Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="cliffMonths" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliff (months)</FormLabel>
                    <FormControl><Input type="number" min={0} {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="vestingMonths" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vesting (months)</FormLabel>
                    <FormControl><Input type="number" min={1} {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea rows={2} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <SheetFooter className="px-6 py-4 border-t">
              <LoadingButton type="submit" isPending={createMut.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground w-full">
                Create Grant & Generate Schedule
              </LoadingButton>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
