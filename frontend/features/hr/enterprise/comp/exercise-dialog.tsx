"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useRecordExercise } from "@/hooks/api/hr/enterprise-comp";

const schema = z.object({
  exerciseDate: z.string().min(1, "Required"),
  units: z.number().int().positive(),
  amountCents: z.number().int().min(0),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  grantId: number;
}

export function ExerciseDialog({ open, onOpenChange, grantId }: Props) {
  const exerciseMut = useRecordExercise();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { exerciseDate: new Date().toISOString().slice(0, 10) },
  });

  function onSubmit(values: FormValues) {
    exerciseMut.mutate(
      { grantId, ...values, units: Number(values.units), amountCents: Number(values.amountCents) },
      {
        onSuccess: () => { toast.success("Exercise recorded"); onOpenChange(false); form.reset(); },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record Exercise</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="exerciseDate" render={({ field }) => (
              <FormItem>
                <FormLabel>Exercise Date</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
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
              <FormField control={form.control} name="amountCents" render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (cents)</FormLabel>
                  <FormControl><Input type="number" min={0} {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <DialogFooter>
              <LoadingButton type="submit" isPending={exerciseMut.isPending} className="bg-blue-700 hover:bg-blue-800 text-white w-full">
                Record Exercise
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
